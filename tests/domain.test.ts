import { describe, it, expect } from "vitest";
import {
  safeNext,
  effectiveStatus,
  filterProviders,
  type Booking,
  type Provider,
} from "../src/domain";
describe("customer journey", () => {
  it("rejects external OAuth return paths", () => {
    expect(safeNext("//evil.example")).toBe("/bookings");
    expect(safeNext("/\\evil.example")).toBe("/bookings");
    expect(safeNext("https://evil.example")).toBe("/bookings");
    expect(safeNext("/checkout/package?start=123")).toBe(
      "/checkout/package?start=123",
    );
  });
  it("does not expire payment under review", () => {
    const b = { status: "PAYMENT_REVIEW", hold_until: "2020-01-01" } as Booking;
    expect(effectiveStatus(b)).toBe("PAYMENT_REVIEW");
    expect(effectiveStatus({ ...b, status: "REQUESTED" })).toBe("EXPIRED");
  });
  it("combines service, district, style, and budget rather than choosing one", () => {
    const p = {
      id: "1",
      name: "Test",
      status: "APPROVED",
      category: "Photographer",
      districts: ["Quận 1"],
      styles: ["Natural"],
      packages: [{ active: true, price: 900000, service: "Personal" }],
    } as Provider;
    const f = {
      category: "Photographer",
      district: "Quận 1",
      style: "Natural",
      service: "Personal",
      budget: 1000000,
      query: "",
    };
    expect(filterProviders([p], f)).toHaveLength(1);
    expect(filterProviders([p], { ...f, district: "Quận 3" })).toHaveLength(0);
    expect(filterProviders([p], { ...f, budget: 500000 })).toHaveLength(0);
    expect(filterProviders([{ ...p, status: "PENDING" }], f)).toHaveLength(0);
  });
});
