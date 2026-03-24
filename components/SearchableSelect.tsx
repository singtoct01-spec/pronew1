import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'เลือก...',
  className = '',
  required = false,
  disabled = false,
  allowCustom = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    if (selectedOption && !isOpen) {
      setSearchTerm(selectedOption.label);
    } else if (!isOpen && !allowCustom) {
      setSearchTerm('');
    } else if (!isOpen && allowCustom && value) {
      setSearchTerm(value);
    }
  }, [selectedOption, isOpen, allowCustom, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else if (allowCustom && searchTerm.trim() !== '') {
          onChange(searchTerm.trim());
        } else if (!allowCustom) {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, allowCustom, searchTerm, onChange]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (e.target.value === '') {
      onChange('');
    } else if (allowCustom) {
      onChange(e.target.value);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div
        className={`w-full flex items-center border border-slate-300 rounded-lg bg-white transition-colors overflow-hidden ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-slate-400 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500'
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full p-2.5 text-sm outline-none bg-transparent truncate"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          disabled={disabled}
          required={required && !value}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              // Select all text when focused to make it easy to type a new search
              if (inputRef.current) {
                inputRef.current.select();
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && allowCustom) {
              e.preventDefault();
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
        
        <div className="flex items-center pr-2 gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={clearSelection}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg flex flex-col overflow-hidden max-h-60">
          <div className="overflow-y-auto p-1">
            {filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`p-2.5 text-sm rounded-md cursor-pointer flex items-center justify-between transition-colors ${
                  value === opt.value 
                    ? 'bg-brand-50 text-brand-700 font-medium' 
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                onMouseDown={(e) => {
                  // Prevent input blur before click registers
                  e.preventDefault();
                }}
                onClick={() => {
                  onChange(opt.value);
                  setSearchTerm(opt.label);
                  setIsOpen(false);
                  inputRef.current?.blur();
                }}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check size={16} className="text-brand-600 flex-shrink-0 ml-2" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
