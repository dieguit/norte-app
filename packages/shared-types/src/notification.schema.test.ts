import { describe, expect, it } from "vitest";
import {
  NotificationTimeSchema,
  UpdateNotificationSettingSchema,
} from "./notification.schema";

describe("notification schema", () => {
  it.each(["00:00", "09:30", "21:00", "23:30"])("accepts slot %s", (time) => {
    expect(NotificationTimeSchema.safeParse(time).success).toBe(true);
  });

  it.each(["21:15", "24:00", "9:00", "21:00:00", "", "aa:bb"])(
    "rejects %s",
    (time) => {
      expect(NotificationTimeSchema.safeParse(time).success).toBe(false);
    },
  );

  it("requires enabled or time on update", () => {
    expect(UpdateNotificationSettingSchema.safeParse({}).success).toBe(false);
    expect(
      UpdateNotificationSettingSchema.safeParse({ enabled: true }).success,
    ).toBe(true);
    expect(
      UpdateNotificationSettingSchema.safeParse({ time: "22:30" }).success,
    ).toBe(true);
  });
});
