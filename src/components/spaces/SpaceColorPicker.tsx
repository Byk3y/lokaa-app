
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { COLOR_OPTIONS } from "./SpaceColorOptions";
import { Control } from "react-hook-form";

// Create a simple, completely decoupled props interface with a specific type
interface SpaceColorPickerProps {
  control: Control<any>; // Use 'any' to break potential circular dependencies
}

export function SpaceColorPicker({ control }: SpaceColorPickerProps) {
  return (
    <FormField
      control={control}
      name="color"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Space Color Theme</FormLabel>
          <FormControl>
            <div className="grid grid-cols-4 gap-3">
              {COLOR_OPTIONS.map((color) => (
                <div key={color.value} className="text-center">
                  <button
                    type="button"
                    onClick={() => field.onChange(color.value)}
                    className={`h-10 w-10 rounded-full ${color.class} mx-auto mb-1 flex items-center justify-center transition-all ${
                      field.value === color.value 
                        ? 'ring-2 ring-offset-2 ring-black' 
                        : 'hover:scale-110'
                    }`}
                    aria-label={`Select ${color.name} color`}
                  >
                    {field.value === color.value && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    )}
                  </button>
                  <p className="text-xs font-medium">{color.name}</p>
                </div>
              ))}
            </div>
          </FormControl>
          <FormDescription>
            This color will be used for accent elements in your space.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
