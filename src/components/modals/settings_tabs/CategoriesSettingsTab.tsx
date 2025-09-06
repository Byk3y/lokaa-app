import React, { useState, useEffect, memo } from 'react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedCachedCategories } from '@/hooks/useOptimizedCachedCategories';
import type { SpaceCategory } from '@/hooks/useCategoriesCache';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from '@/integrations/supabase/client'; // For direct DB operations
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSettingsValidation } from '@/hooks/useSettingsValidation';
import { withPerformanceMemo } from '@/components/performance/MemoizedComponents';

const iconOptions = ['💬', '📢', '❓', '💡', '📚', '🔧', '🎯', '🎓', '🎨', '🎮', '💼', '🏆', '🎉', '💡', '⭐'];

interface CategoryEditState extends Partial<SpaceCategory> {
  originalName?: string;
  originalIcon?: string;
}

function CategoriesSettingsTab() {
  const { space, permissions } = useSpaceSettingsStore();
  const { user } = useOptimizedAuth();
  const { 
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refreshCategories
  } = useOptimizedCachedCategories(space?.id);

  // Add validation hook
  const {
    validateData,
    validateField,
    errors,
    isValid,
    isValidating
  } = useSettingsValidation('categories', { validateOnChange: true });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(iconOptions[0]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryEditState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate initial data
  useEffect(() => {
    validateData({ categories });
  }, [categories, validateData]);

  const handleStartAddNew = () => {
    setIsAddingNew(true);
    setNewCategoryName("");
    setNewCategoryIcon(iconOptions[0]);
  };

  const handleCancelAddNew = () => {
    setIsAddingNew(false);
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim() || !space?.id || !user?.id) {
      toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }

    // Validate new category
    const newCategory = {
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      id: 'temp', // Temporary ID for validation
    };

    const isValidCategory = await validateData({
      categories: [...categories, newCategory]
    });

    if (!isValidCategory) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseClient().from('space_categories').insert({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        space_id: space.id,
        created_by: user.id,
        is_archived: false
      });
      if (error) throw error;
      toast({ title: "Success", description: "Category created successfully." });
      await refreshCategories();
      setIsAddingNew(false);
    } catch (error: any) {
      toast({ title: "Error Creating Category", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (category: SpaceCategory) => {
    setEditingCategoryId(category.id);
    setEditForm({ 
      id: category.id,
      name: category.name,
      icon: category.icon || iconOptions[0],
      originalName: category.name,
      originalIcon: category.icon || iconOptions[0]
    });
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditForm({});
  };

  const handleEditFormChange = (field: keyof CategoryEditState, value: string) => {
    const newForm = { ...editForm, [field]: value };
    setEditForm(newForm);

    // Validate the edited category
    const updatedCategories = categories.map(cat => 
      cat.id === editForm.id ? { ...cat, [field]: value } : cat
    );
    validateData({ categories: updatedCategories });
  };

  const handleSaveEdit = async () => {
    if (!editForm.id || !editForm.name?.trim() || !space?.id) return;
    if (editForm.name === editForm.originalName && editForm.icon === editForm.originalIcon) {
      toast({ title: "No Changes", description: "No changes detected in category details." });
      handleCancelEdit();
      return;
    }

    // Validate the edited category
    const updatedCategories = categories.map(cat => 
      cat.id === editForm.id ? { ...cat, name: editForm.name, icon: editForm.icon } : cat
    );
    const isValidCategory = await validateData({ categories: updatedCategories });

    if (!isValidCategory) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseClient().from('space_categories').update({
        name: editForm.name.trim(),
        icon: editForm.icon
      }).eq('id', editForm.id);
      if (error) throw error;
      toast({ title: "Success", description: "Category updated successfully." });
      await refreshCategories();
      handleCancelEdit();
    } catch (error: any) {
      toast({ title: "Error Updating Category", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) return;

    // Validate categories after deletion
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    const isValidCategories = await validateData({ categories: updatedCategories });

    if (!isValidCategories) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseClient().from('space_categories').update({ is_archived: true }).eq('id', categoryId);
      if (error) throw error;
      toast({ title: "Success", description: "Category archived successfully." });
      await refreshCategories();
    } catch (error: any) {
      toast({ title: "Error Archiving Category", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (categoriesLoading) {
    return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (categoriesError) {
    return <div className="p-6 text-red-500">Error loading categories: {categoriesError}</div>;
  }

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

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Manage Categories</h2>
        {!isAddingNew && permissions?.canEditSpace && (
          <Button onClick={handleStartAddNew} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600 dark:text-white">
            <Plus className="mr-2 h-4 w-4" /> Add New Category
          </Button>
        )}
      </div>

      {isAddingNew && (
        <div className="p-4 border rounded-md bg-slate-50 space-y-3">
          <h3 className="font-medium">Add New Category</h3>
          <div className="space-y-2">
            <Input 
              placeholder="Category Name" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)} 
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.name[0]}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm">Icon:</Label>
            <select 
              value={newCategoryIcon} 
              onChange={(e) => setNewCategoryIcon(e.target.value)}
              className={`p-2 border rounded-md text-lg bg-white ${errors.icon ? 'border-red-500' : ''}`}
            >
              {iconOptions.map(icon => <option key={icon} value={icon}>{icon}</option>)}
            </select>
            {errors.icon && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.icon[0]}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={handleCancelAddNew} size="sm" disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddNewCategory} size="sm" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Category
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.length === 0 && !isAddingNew && (
          <p className="text-gray-500">No categories found. Add your first category!</p>
        )}
        {categories.map((category) => (
          <div key={category.id} className={`p-3 border rounded-md flex items-center justify-between hover:bg-slate-50 ${
            errors[`categories.${category.id}`] ? 'border-red-500' : ''
          }`}>
            {editingCategoryId === category.id ? (
              <div className="flex-grow space-y-2">
                <Input 
                  value={editForm.name || ''} 
                  onChange={(e) => handleEditFormChange('name', e.target.value)} 
                  className={`text-base ${errors[`categories.${category.id}.name`] ? 'border-red-500' : ''}`}
                />
                {errors[`categories.${category.id}.name`] && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors[`categories.${category.id}.name`][0]}
                  </p>
                )}
                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Icon:</Label>
                  <select 
                    value={editForm.icon || iconOptions[0]} 
                    onChange={(e) => handleEditFormChange('icon', e.target.value)}
                    className={`p-2 border rounded-md text-lg bg-white ${
                      errors[`categories.${category.id}.icon`] ? 'border-red-500' : ''
                    }`}
                  >
                    {iconOptions.map(icon => <option key={`edit-${icon}`} value={icon}>{icon}</option>)}
                  </select>
                  {errors[`categories.${category.id}.icon`] && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors[`categories.${category.id}.icon`][0]}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSubmitting}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={isSubmitting || !isValid}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-2xl mr-3">{category.icon || '📁'}</span>
                <span className="font-medium">{category.name}</span>
              </div>
            )}
            {editingCategoryId !== category.id && permissions?.canEditSpace && (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)} title="Edit Category">
                  <Edit2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} title="Archive Category" className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 🚀 PERFORMANCE FIX: Enhanced React.memo with custom comparison to prevent unnecessary re-renders
const CategoriesSettingsTabMemo = memo(CategoriesSettingsTab, (prevProps, nextProps) => {
  // Since this component has no props, we should never re-render unless the component itself changes
  // This memoization is primarily for internal state optimization
  return true; // Always return true to prevent re-renders based on props (since there are none)
});

export default withPerformanceMemo(CategoriesSettingsTabMemo, 'CategoriesSettingsTab');