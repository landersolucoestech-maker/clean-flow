import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type CommonProps = {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  buttonClassName?: string;
};

export type DatePickerProps = CommonProps & {
  value?: Date;
  onChange: (date?: Date) => void;
};

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  buttonClassName,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MM/dd/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

function ymdToDate(value?: string) {
  if (!value) return undefined;
  // Avoid timezone shifts when parsing a yyyy-MM-dd string
  return new Date(`${value}T00:00:00`);
}

export type DatePickerStringProps = CommonProps & {
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function DatePickerString({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  buttonClassName,
  required,
}: DatePickerStringProps) {
  const dateValue = React.useMemo(() => ymdToDate(value), [value]);

  return (
    <div>
      <DatePicker
        id={id}
        value={dateValue}
        onChange={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
        placeholder={placeholder}
        disabled={disabled}
        buttonClassName={buttonClassName}
      />

      {/* Keep native required validation semantics when used inside forms */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          type="date"
          value={value ?? ""}
          readOnly
          required
        />
      )}
    </div>
  );
}
