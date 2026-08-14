import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { useAddressAutocomplete, AddressSuggestion } from "@/hooks/useAddressAutocomplete";

interface AddressAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocompleteInput({
  id,
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className,
}: AddressAutocompleteInputProps) {
  const { suggestions, isLoading, searchAddress, clearSuggestions } = useAddressAutocomplete();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchAddress(value);
      }, 300);
    } else {
      clearSuggestions();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, searchAddress, clearSuggestions]);

  // Show dropdown when we have suggestions
  useEffect(() => {
    setShowDropdown(suggestions.length > 0);
    setSelectedIndex(-1);
  }, [suggestions]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const streetAddress = suggestion.housenumber
      ? `${suggestion.housenumber} ${suggestion.street}`
      : suggestion.street;
    onChange(streetAddress);
    onSelect(suggestion);
    setShowDropdown(false);
    clearSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={cn("pr-8", className)}
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ position: 'absolute' }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-start gap-2 hover:bg-accent transition-colors",
                selectedIndex === index && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {suggestion.housenumber} {suggestion.street}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[suggestion.city, suggestion.state, suggestion.postcode]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
