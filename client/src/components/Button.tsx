import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px]",
      secondary: "bg-indigo-900 text-white hover:bg-indigo-800 shadow-lg shadow-indigo-900/30 border-b-4 border-indigo-950 active:border-b-0 active:translate-y-[4px]",
      outline: "bg-transparent border-2 border-indigo-900 text-indigo-900 hover:bg-indigo-50",
      ghost: "bg-transparent hover:bg-black/5 text-foreground",
      destructive: "bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/30 border-b-4 border-orange-800 active:border-b-0 active:translate-y-[4px]"
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-12 px-6 text-base",
      lg: "h-14 px-8 text-lg",
      icon: "h-10 w-10 p-0"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30",
          variants[variant],
          sizes[size],
          (disabled || isLoading) && "opacity-50 pointer-events-none border-b-0 transform-none",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
