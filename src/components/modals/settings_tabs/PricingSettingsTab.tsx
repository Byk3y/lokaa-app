import React, { useState, useEffect } from 'react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, XCircle, Edit3, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PricingSettingsTab() {
  const { formData, setFormDataField, permissions, space } = useSpaceSettingsStore();
  const [priceInput, setPriceInput] = useState<string>('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    if (formData?.pricing_type === 'paid' && formData.price_per_month !== undefined && formData.price_per_month !== null) {
      setPriceInput(String(formData.price_per_month));
    } else {
      setPriceInput(''); // Clear if free or no price
    }
    // If space becomes free, exit editing mode
    if (formData?.pricing_type === 'free') {
      setIsEditingPrice(false);
    }
  }, [formData?.pricing_type, formData?.price_per_month]);

  const handleAddPriceClick = () => {
    setFormDataField('pricing_type', 'paid');
    setPriceInput('10'); // Default to 10 or some other value
    setFormDataField('price_per_month', 10);
    setIsEditingPrice(true); // Show input field for new price
  };

  const handleRemovePriceClick = () => {
    setFormDataField('pricing_type', 'free');
    setFormDataField('price_per_month', null);
    setPriceInput('');
    setIsEditingPrice(false);
    // Also disable 7-day trial if it was on
    if (formData?.feature_7_day_trial_enabled) {
      setFormDataField('feature_7_day_trial_enabled', false);
    }
    toast({ title: "Price Removed", description: "Space is now free. Save changes to apply." });
  };

  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPriceInput(value);
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setFormDataField('price_per_month', numericValue);
    } else if (value === '') {
      setFormDataField('price_per_month', null); // Allow clearing the input
    }
  };
  
  const handlePriceInputBlur = () => {
    const numericValue = parseFloat(priceInput);
    if (priceInput === '' || isNaN(numericValue) || numericValue <= 0) {
      // If input is cleared or invalid, and it was previously 'paid', revert to 'free'
      // This prevents saving a 'paid' space with no valid price.
      if (formData?.pricing_type === 'paid') {
         toast({ title: "Invalid Price", description: "Price must be a positive number. Reverting to free.", variant: "destructive" });
         handleRemovePriceClick(); // This will set to free and nullify price
      }
    } else {
      setFormDataField('price_per_month', numericValue);
    }
  };


  const isPaid = formData?.pricing_type === 'paid';
  const canEdit = permissions?.canEditSpace ?? false;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Pricing</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Make money by charging for access to your community. 
          <a href="#" className="text-yellow-600 hover:text-yellow-500 ml-1">Learn more.</a>
        </p>
      </div>

      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {isPaid && formData.price_per_month !== null && formData.price_per_month !== undefined ? (
              <>
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-gray-700 dark:text-gray-300 mr-2" />
                  <span className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                    ${formData.price_per_month}
                  </span>
                  <span className="ml-1.5 text-sm text-gray-500 dark:text-gray-400">per month</span>
                  <Badge variant="default" className="ml-3 bg-green-600 text-white">Current price</Badge>
                </div>
                {/* <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {space?.member_count || 0} members
                </p> */}
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <Tag className="h-5 w-5 text-gray-700 dark:text-gray-300 mr-2" />
                  <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">Free</span>
                </div>
                 {/* <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {space?.member_count || 0} members
                </p> */}
              </>
            )}
          </div>
          
          {canEdit && (
            <div className="flex-shrink-0">
              {!isPaid ? (
                <Button 
                  onClick={handleAddPriceClick}
                  className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600 dark:text-white"
                  size="sm"
                >
                  Add Price
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleRemovePriceClick} 
                  className="text-red-600 border-red-500 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                  size="sm"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Remove Price
                </Button>
              )}
            </div>
          )}
        </div>

        {isPaid && canEdit && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <Label htmlFor="price_per_month" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Set Monthly Price (USD)
            </Label>
            <div className="relative">
               <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="price_per_month"
                type="number"
                value={priceInput}
                onChange={handlePriceInputChange}
                onBlur={handlePriceInputBlur}
                placeholder="e.g., 10"
                className="pl-10 w-full sm:w-48 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-50"
                min="0.01" 
                step="0.01"
                disabled={!canEdit}
              />
            </div>
          </div>
        )}
      </div>

      {isPaid && canEdit && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="feature_7_day_trial_enabled" className="text-base font-semibold text-gray-800 dark:text-gray-100">
                Give members a 7-day free trial
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Allow new members to try out your community for 7 days before their paid subscription starts.
              </p>
            </div>
            <Switch
              id="feature_7_day_trial_enabled"
              checked={formData?.feature_7_day_trial_enabled || false}
              onCheckedChange={(isChecked) => setFormDataField('feature_7_day_trial_enabled', isChecked)}
              disabled={!canEdit || !isPaid}
              className="ml-4"
            />
          </div>
        </div>
      )}
       {!canEdit && (
         <p className="text-sm text-center text-gray-500 dark:text-gray-400">
           You do not have permission to change pricing settings.
         </p>
       )}
    </div>
  );
} 