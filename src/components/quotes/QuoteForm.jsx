import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function QuoteForm({ onSuccess, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    description: initialData.description || "",
    client_id: initialData.client_id || "",
    site_id: initialData.site_id || "",
    vat_rate: initialData.vat_rate || 20,
    valid_until: initialData.valid_until || "",
    notes: initialData.notes || "",
  });

  const [lineItems, setLineItems] = useState(initialData.line_items || [
    { description: "", quantity: 1, unit_price: 0, total: 0 }
  ]);

  const [saving, setSaving] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const calculateVAT = () => {
    return (calculateSubtotal() * formData.vat_rate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const quoteNumber = `QT-${Date.now().toString().slice(-8)}`;
      const subtotal = calculateSubtotal();
      const vatAmount = calculateVAT();
      const total = calculateTotal();

      await base44.entities.Quote.create({
        ...formData,
        quote_number: quoteNumber,
        line_items: lineItems,
        subtotal,
        vat_amount: vatAmount,
        total,
        status: 'draft',
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error creating quote:", error);
      alert("Failed to create quote. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Quote Title *</Label>
          <Input
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="glass-effect border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g. Boiler Installation"
          />
        </div>
        <div>
          <Label className="text-white/90">Site *</Label>
          <Select value={formData.site_id} onValueChange={(value) => setFormData({ ...formData, site_id: value, client_id: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-white/90">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50 min-h-[80px]"
          placeholder="Quote description..."
        />
      </div>

      {/* Line Items */}
      <div className="glass-effect rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-white/90 text-lg">Line Items</Label>
          <Button
            type="button"
            onClick={addLineItem}
            size="sm"
            className="glass-effect border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="glass-effect rounded-lg p-4 border border-white/10">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <Label className="text-white/70 text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="glass-effect border-white/20 text-white placeholder:text-white/50 mt-1"
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-white/70 text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="glass-effect border-white/20 text-white mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-white/70 text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="glass-effect border-white/20 text-white mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-white/70 text-xs">Total</Label>
                  <div className="glass-effect rounded-lg px-3 py-2 border border-white/20 text-white font-semibold mt-1">
                    £{item.total.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="glass-effect rounded-xl p-4 border border-white/20">
        <div className="space-y-2 max-w-sm ml-auto">
          <div className="flex justify-between text-white/90">
            <span>Subtotal:</span>
            <span className="font-semibold">£{calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white/90 items-center gap-4">
            <span>VAT ({formData.vat_rate}%):</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                className="glass-effect border-white/20 text-white w-20 h-8"
              />
              <span className="font-semibold">£{calculateVAT().toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-white/20">
            <span>Total:</span>
            <span>£{calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Additional Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Valid Until</Label>
          <Input
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
        <div>
          <Label className="text-white/90">Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="glass-effect border-white/20 text-white placeholder:text-white/50"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 glass-effect border-white/30 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 glass-effect-strong border-white/30 text-white hover:bg-white/20"
        >
          {saving ? "Creating..." : "Create Quote"}
        </Button>
      </div>
    </form>
  );
}