import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "@/components/ui/logo";
import { Brand } from "@/components/ui/brand";

describe("Logo Component", () => {
  it("renders default logo with escalou text and symbol", () => {
    render(<Logo />);
    const textEl = screen.getByTestId("logo-text");
    expect(textEl).toHaveTextContent("escalou");
    const symbolEl = screen.getByTestId("logo-symbol-dot");
    expect(symbolEl).toHaveTextContent("◉");
  });

  it("renders circle variant with circular symbol wrapper", () => {
    render(<Logo variant="circle" />);
    const circleSymbol = screen.getByTestId("logo-symbol-circle");
    expect(circleSymbol).toBeInTheDocument();
    expect(circleSymbol).toHaveTextContent("◉");
    expect(screen.getByTestId("logo-text")).toHaveTextContent("escalou");
  });

  it("renders text-only variant without any symbol", () => {
    render(<Logo variant="text-only" />);
    expect(screen.getByTestId("logo-text")).toHaveTextContent("escalou");
    expect(screen.queryByTestId("logo-symbol-dot")).not.toBeInTheDocument();
    expect(screen.queryByTestId("logo-symbol-circle")).not.toBeInTheDocument();
  });

  it("renders symbol-only variant without text", () => {
    render(<Logo variant="symbol-only" />);
    expect(screen.getByTestId("logo-symbol-dot")).toBeInTheDocument();
    expect(screen.queryByTestId("logo-text")).not.toBeInTheDocument();
  });

  it("renders as link when href is provided", () => {
    render(<Logo href="/inicio" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/inicio");
    expect(link).toHaveTextContent("escalou");
  });

  it("renders Brand component delegating to Logo with escalou", () => {
    render(<Brand />);
    expect(screen.getByTestId("logo-text")).toHaveTextContent("escalou");
    expect(screen.getByTestId("logo-symbol-circle")).toBeInTheDocument();
  });
});
