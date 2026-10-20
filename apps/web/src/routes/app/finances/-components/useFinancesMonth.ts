import { useEffect, useRef, useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { getFinancesWorkspace } from "../../../../features/financial/financial.functions";

export function useFinancesMonth(
  workspace: FinancesWorkspace,
  initialMonth = new Date().toISOString().slice(0, 7),
) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [monthData, setMonthData] = useState(workspace);
  const [freshForWorkspace, setFreshForWorkspace] = useState<typeof workspace | null>(workspace);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);

  const selectMonth = (month: string) => {
    setFreshForWorkspace(null);
    setSelectedMonth(month);
  };

  useEffect(() => {
    if (workspace.month === selectedMonth) {
      setMonthData(workspace);
      setFreshForWorkspace(workspace);
      setLoadingMonth(false);
      setLoadError(false);
      return;
    }
    const id = ++requestId.current;
    setFreshForWorkspace(null);
    setLoadingMonth(true);
    setLoadError(false);
    getFinancesWorkspace({ data: { month: selectedMonth } }).then((next) => {
      if (id === requestId.current && next?.month === selectedMonth) {
        setMonthData(next);
        setFreshForWorkspace(workspace);
      }
      else if (id === requestId.current) setLoadError(true);
    }).catch(() => {
      if (id === requestId.current) setLoadError(true);
    }).finally(() => {
      if (id === requestId.current) setLoadingMonth(false);
    });
    return () => { requestId.current += 1; };
  }, [selectedMonth, workspace]);

  const current = !loadingMonth && freshForWorkspace === workspace && monthData.month === selectedMonth ? monthData : null;

  return { selectedMonth, selectMonth, current, loadingMonth, loadError };
}
