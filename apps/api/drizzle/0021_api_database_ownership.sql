DO $takeover$
DECLARE
  table_name text;
  relation_oid oid;
  expected_columns jsonb;
  actual_columns jsonb;
  pk_column text;
  pk_attnum smallint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users', 'whatsapp_auth_state'] LOOP
    relation_oid := to_regclass(format('public.%I', table_name));
    IF relation_oid IS NULL THEN
      IF table_name = 'users' THEN
        CREATE TABLE public.users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          name text NOT NULL,
          phone text NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
        );
      ELSE
        CREATE TABLE public.whatsapp_auth_state (
          key text PRIMARY KEY NOT NULL,
          value jsonb NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
        );
      END IF;
      relation_oid := to_regclass(format('public.%I', table_name));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c WHERE c.oid = relation_oid
        AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
        AND c.relpersistence = 'p' AND NOT c.relispartition
        AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity
    ) OR EXISTS (
      SELECT 1 FROM pg_inherits WHERE inhrelid = relation_oid OR inhparent = relation_oid
    ) THEN
      RAISE EXCEPTION 'API ownership: incompatible public.% relation', table_name;
    END IF;

    IF table_name = 'users' THEN
      pk_column := 'id';
      expected_columns := '[
        ["created_at","timestamp with time zone",true,"now()","",""],
        ["id","uuid",true,"gen_random_uuid()","",""],
        ["name","text",true,null,"",""],
        ["phone","text",true,null,"",""],
        ["updated_at","timestamp with time zone",true,"now()","",""]]'::jsonb;
    ELSE
      pk_column := 'key';
      expected_columns := '[
        ["created_at","timestamp with time zone",true,"now()","",""],
        ["key","text",true,null,"",""],
        ["updated_at","timestamp with time zone",true,"now()","",""],
        ["value","jsonb",true,null,"",""]]'::jsonb;
    END IF;

    SELECT jsonb_agg(jsonb_build_array(a.attname, format_type(a.atttypid,a.atttypmod),
      a.attnotnull, pg_get_expr(d.adbin,d.adrelid), a.attidentity, a.attgenerated) ORDER BY a.attname)
      INTO actual_columns
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=relation_oid AND a.attnum>0 AND NOT a.attisdropped;
    IF actual_columns IS DISTINCT FROM expected_columns THEN
      RAISE EXCEPTION 'API ownership: incompatible public.% columns/defaults: %', table_name, actual_columns;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
      WHERE a.attrelid=relation_oid AND a.attnum>0 AND NOT a.attisdropped
        AND a.attcollation<>t.typcollation
    ) THEN
      RAISE EXCEPTION 'API ownership: incompatible public.% collation', table_name;
    END IF;

    SELECT attnum INTO pk_attnum FROM pg_attribute
      WHERE attrelid=relation_oid AND attname=pk_column AND NOT attisdropped;
    IF (SELECT count(*) FROM pg_constraint WHERE conrelid=relation_oid AND contype <> 'n') <> 1
      OR NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid=relation_oid
          AND conname=table_name || '_pkey' AND contype='p'
          AND conkey=ARRAY[pk_attnum] AND convalidated AND NOT condeferrable AND NOT condeferred
          AND conislocal AND coninhcount=0
      ) THEN
      RAISE EXCEPTION 'API ownership: incompatible public.% constraints/primary key', table_name;
    END IF;

    IF (SELECT count(*) FROM pg_index WHERE indrelid=relation_oid) <> 1
      OR NOT EXISTS (
        SELECT 1 FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid
          JOIN pg_am am ON am.oid=ic.relam
          JOIN pg_constraint k ON k.conindid=i.indexrelid AND k.conrelid=relation_oid
        WHERE i.indrelid=relation_oid AND i.indisprimary AND i.indisunique
          AND i.indisvalid AND i.indisready AND i.indislive
          AND NOT i.indnullsnotdistinct AND i.indnkeyatts=1 AND i.indnatts=1
          AND i.indkey::text=pk_attnum::text AND i.indpred IS NULL AND i.indexprs IS NULL
          AND am.amname='btree' AND ic.relname=table_name || '_pkey'
          AND ic.relnamespace='public'::regnamespace AND ic.reloptions IS NULL
          AND pg_get_indexdef(i.indexrelid)=format(
            'CREATE UNIQUE INDEX %I ON public.%I USING btree (%I)', table_name || '_pkey', table_name, pk_column)
      ) THEN
      RAISE EXCEPTION 'API ownership: incompatible public.% indexes', table_name;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=relation_oid AND NOT tgisinternal)
      OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid=relation_oid) THEN
      RAISE EXCEPTION 'API ownership: incompatible public.% triggers/policies', table_name;
    END IF;
  END LOOP;
END
$takeover$;
