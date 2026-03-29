import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AlertRuleForm({ rule, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(rule || {
    type: 'SLA_BREACHES',
    threshold_number: 5,
    operator: '>=',
    channel: 'email',
    destination: '',
    is_active: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const typeOptions = [
    { value: 'SLA_BREACHES', label: 'SLA Breaches', unit: 'jobs', default: 5 },
    { value: 'ORG_HEALTH', label: 'Organization Health', unit: '/100', default: 70 },
    { value: 'UTILISATION', label: 'Engineer Utilisation', unit: '%', default: 85 },
    { value: 'OVERDUE_INVOICES', label: 'Overdue Invoices', unit: '£', default: 25000 }
  ];

  const selectedType = typeOptions.find(t => t.value === formData.type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-white mb-2 block">Alert Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => {
            const type = typeOptions.find(t => t.value === value);
            setFormData({
              ...formData, 
              type: value,
              threshold_number: type?.default || 0
            });
          }}
        >
          <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white mb-2 block">Operator</Label>
          <Select
            value={formData.operator}
            onValueChange={(value) => setFormData({...formData, operator: value})}
          >
            <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=">">Greater than (&gt;)</SelectItem>
              <SelectItem value="<">Less than (&lt;)</SelectItem>
              <SelectItem value=">=">Greater or equal (≥)</SelectItem>
              <SelectItem value="<=">Less or equal (≤)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-white mb-2 block">
            Threshold {selectedType?.unit && `(${selectedType.unit})`}
          </Label>
          <Input
            type="number"
            value={formData.threshold_number}
            onChange={(e) => setFormData({...formData, threshold_number: parseFloat(e.target.value)})}
            className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
            placeholder={`e.g., ${selectedType?.default}`}
          />
        </div>
      </div>

      <div>
        <Label className="text-white mb-2 block">Delivery Channel</Label>
        <Select
          value={formData.channel}
          onValueChange={(value) => setFormData({...formData, channel: value})}
        >
          <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="inapp">In-App Notification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.channel !== 'inapp' && (
        <div>
          <Label className="text-white mb-2 block">
            {formData.channel === 'email' ? 'Email Address' : 'Slack Webhook URL'}
          </Label>
          <Input
            type={formData.channel === 'email' ? 'email' : 'url'}
            value={formData.destination}
            onChange={(e) => setFormData({...formData, destination: e.target.value})}
            className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
            placeholder={
              formData.channel === 'email' 
                ? 'director@company.com' 
                : 'https://hooks.slack.com/services/...'
            }
          />
        </div>
      )}

      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
          className="w-4 h-4 rounded border-[rgba(255,255,255,0.08)]"
        />
        <Label htmlFor="is_active" className="text-white cursor-pointer">
          Active (alert will be evaluated every 15 minutes)
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          disabled={formData.channel !== 'inapp' && !formData.destination}
        >
          {rule ? 'Update Alert' : 'Create Alert'}
        </Button>
      </div>
    </form>
  );
}