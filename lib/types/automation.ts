/**
 * Automation Script Type Definitions
 * 
 * Defines the structure of automation script metadata used
 * to display scripts in the UI and map them to their handlers.
 */

/**
 * Metadata for an automation script
 */
export interface AutomationScript {
  /** Unique identifier for the script (used for mapping to handlers) */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Brief description of what the script does */
  description: string;
  /** Category for grouping in the UI */
  category?: 'Setup & Users' | 'Security & Policies' | 'Applications' | 'Governance' | 'Tools';
  /** Whether this script requires user input fields */
  requiresInput?: boolean;
  /** Input fields configuration */
  inputFields?: {
    name: string;
    label: string;
    type: 'text' | 'email' | 'select';
    placeholder?: string;
    required?: boolean;
    /** For select fields: options to display */
    options?: { value: string; label: string }[];
    /** For select fields: whether options should be loaded dynamically */
    dynamicOptions?: boolean;
    /** For select fields: whether to allow multiple selections */
    multiple?: boolean;
  }[];
}
