import React, { useState, useEffect } from 'react';
import useSpaceSettingsStore, { type RuleItem } from '@/hooks/useSpaceSettingsStore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, GripVertical, Edit2, Check, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useSettingsValidation } from '@/hooks/useSettingsValidation';
import { Alert } from "@/components/ui/alert";

interface EditableRuleProps {
  rule: RuleItem;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  errors?: string[];
}

const EditableRule: React.FC<EditableRuleProps> = ({ rule, onUpdate, onDelete, canEdit, errors = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(rule.text);

  const handleSave = () => {
    if (editText.trim() === '') {
      setEditText(rule.text);
    } else if (editText.trim() !== rule.text) {
      onUpdate(rule.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(rule.text);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col p-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md shadow-sm transition-shadow hover:shadow-md mb-2">
      <div className="flex items-center">
        {isEditing && canEdit ? (
          <>
            <Input 
              type="text" 
              value={editText} 
              onChange={(e) => setEditText(e.target.value)}
              className={`flex-grow mr-2 h-9 dark:bg-slate-600 dark:border-slate-500 ${errors.length > 0 ? 'border-red-500' : ''}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button onClick={handleSave} size="icon" variant="ghost" className="h-9 w-9 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
              <Check className="h-5 w-5" />
            </Button>
            <Button onClick={handleCancel} size="icon" variant="ghost" className="h-9 w-9 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <>
            <span className="flex-grow text-sm text-gray-800 dark:text-gray-100 mr-2">{rule.text}</span>
            {canEdit && (
              <Button onClick={() => setIsEditing(true)} size="icon" variant="ghost" className="h-9 w-9 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300">
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        {canEdit && (
          <Button onClick={() => onDelete(rule.id)} size="icon" variant="ghost" className="h-9 w-9 ml-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {errors.length > 0 && (
        <div className="mt-2">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default function RulesSettingsTab() {
  const { formData, setFormDataField, permissions } = useSpaceSettingsStore();
  const rules = formData.rules_list || [];
  const canEditRules = permissions?.canEditSpace ?? false;

  // Add validation hook
  const {
    validateData,
    validateField,
    errors,
    isValid,
    isValidating
  } = useSettingsValidation('rules', { validateOnChange: true });

  // Validate initial data
  useEffect(() => {
    validateData({ rules_list: rules });
  }, [rules, validateData]);

  const handleAddRule = () => {
    const newRule: RuleItem = { id: uuidv4(), text: 'New Rule - Edit me' };
    const newRules = [...rules, newRule];
    validateData({ rules_list: newRules }).then(isValid => {
      if (isValid) {
        setFormDataField('rules_list', newRules);
      }
    });
  };

  const handleUpdateRule = (id: string, text: string) => {
    const newRules = rules.map(rule => rule.id === id ? { ...rule, text } : rule);
    validateData({ rules_list: newRules }).then(isValid => {
      if (isValid) {
        setFormDataField('rules_list', newRules);
      }
    });
  };

  const handleDeleteRule = (id: string) => {
    const newRules = rules.filter(rule => rule.id !== id);
    validateData({ rules_list: newRules }).then(isValid => {
      if (isValid) {
        setFormDataField('rules_list', newRules);
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Show validation errors if any */}
      {errors._form && (
        <Alert variant="destructive">
          {errors._form.map((error, i) => (
            <p key={i} className="text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          ))}
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Rules</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Set guidelines for discussion.
          </p>
        </div>
        {canEditRules && (
          <Button onClick={handleAddRule} className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600 dark:text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> NEW
          </Button>
        )}
      </div>

      {rules.length > 0 ? (
        <div className="space-y-1">
          {rules.map((rule, index) => (
            <EditableRule 
              key={rule.id} 
              rule={rule} 
              onUpdate={handleUpdateRule} 
              onDelete={handleDeleteRule}
              canEdit={canEditRules}
              errors={errors[`rules_list.${index}`] || []}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
          No rules set yet. Click "NEW" to add your first rule.
        </p>
      )}
      {!canEditRules && rules.length === 0 && (
         <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
           No rules have been set for this space.
         </p>
      )}
    </div>
  );
} 