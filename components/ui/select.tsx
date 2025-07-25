"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple select component using native HTML select for compatibility
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    onValueChange?: (value: string) => void;
  }
>(({ className, onValueChange, onChange, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    onChange={(e) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    }}
    {...props}
  />
))
Select.displayName = "Select"

// Wrapper component that matches the API expected by the scheduling page
const SelectWrapper = ({ children, value, onValueChange, ...props }: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}) => (
  <Select value={value} onValueChange={onValueChange} {...props}>
    {children}
  </Select>
)

const SelectTrigger = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
const SelectValue = ({ placeholder }: { placeholder?: string }) => null
const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
)

export {
  SelectWrapper as Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
}