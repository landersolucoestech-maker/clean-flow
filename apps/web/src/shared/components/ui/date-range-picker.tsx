import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/useLanguage";
import { getLocaleFromLanguage, formatDateByLanguage } from "@/hooks/useCompanyLanguage";

const APP_TIMEZONE = "America/New_York";

// Prevent timezone shifts when creating Date objects for calendar
function toSafeCalendarDate(date: Date | undefined): Date | undefined {
  if (!date) return undefined;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
}

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  showClearButton?: boolean;
  clearButtonLabel?: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder,
  endPlaceholder,
  showClearButton = true,
  clearButtonLabel,
  className,
}: DateRangePickerProps) {
  const { t, language } = useLanguage();
  const [startDateOpen, setStartDateOpen] = React.useState(false);
  const [endDateOpen, setEndDateOpen] = React.useState(false);

  const formatDateDisplay = (date: Date) => {
    return formatDateByLanguage(date, language);
  };

  const defaultStartPlaceholder = startPlaceholder || t("common.startDate") || "Start Date";
  const defaultEndPlaceholder = endPlaceholder || t("common.endDate") || "End Date";
  const defaultClearLabel = clearButtonLabel || t("common.clearDates") || "Clear dates";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[140px] justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? formatDateDisplay(startDate) : defaultStartPlaceholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={(date) => {
              onStartDateChange(toSafeCalendarDate(date));
              setStartDateOpen(false);
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[140px] justify-start text-left font-normal",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? formatDateDisplay(endDate) : defaultEndPlaceholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={(date) => {
              onEndDateChange(toSafeCalendarDate(date));
              setEndDateOpen(false);
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {showClearButton && (startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onStartDateChange(undefined);
            onEndDateChange(undefined);
          }}
          className="text-muted-foreground"
        >
          {defaultClearLabel}
        </Button>
      )}
    </div>
  );
}

// Single date picker with consistent styling
interface SingleDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export function SingleDatePicker({
  date,
  onDateChange,
  placeholder,
  className,
  buttonClassName,
  disabled,
}: SingleDatePickerProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = React.useState(false);

  const formatDateDisplay = (date: Date) => {
    return formatDateByLanguage(date, language);
  };

  const defaultPlaceholder = placeholder || t("common.pickDate") || "Pick a date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-[140px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateDisplay(date) : defaultPlaceholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onDateChange(toSafeCalendarDate(d));
            setOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
