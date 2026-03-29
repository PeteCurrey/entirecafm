import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calculator, DollarSign } from "lucide-react";

export default function LPCDCalculator({ invoice, orgId }) {
  const [lpcdData, setLpcdData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    calculateLPCD();
  }, [invoice?.id]);

  const calculateLPCD = async () => {
    if (!invoice?.issue_date || !invoice?.total) return;

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('accounts.lpcdCalculator', {
        principal: invoice.total,
        invoice_date: invoice.issue_date,
        org_id: orgId
      });
      
      setLpcdData(result.data);
    } catch (error) {
      console.error("Error calculating LPCD:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <div className="text-center py-6">
          <div className="w-8 h-8 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#CED4DA]">Calculating LPCD...</p>
        </div>
      </div>
    );
  }

  if (!lpcdData) return null;

  return (
    <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
        <h4 className="font-semibold text-white">LPCD Compensation</h4>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#CED4DA]">Principal</span>
          <span className="text-white font-semibold">
            £{lpcdData.principal?.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-[#CED4DA]">Days Overdue</span>
          <span className="text-red-400 font-semibold">
            {lpcdData.days_overdue}
          </span>
        </div>

        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <div className="flex justify-between mb-2">
            <span className="text-[#CED4DA]">Fixed Compensation</span>
            <span className="text-white font-semibold">
              £{lpcdData.fixed_compensation?.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-[#CED4DA] mb-3">
            {lpcdData.principal < 1000 ? '£40 (under £1k)' :
             lpcdData.principal < 10000 ? '£70 (£1k-£10k)' :
             '£100 (over £10k)'}
          </div>
        </div>

        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <div className="flex justify-between mb-2">
            <span className="text-[#CED4DA]">Statutory Interest</span>
            <span className="text-white font-semibold">
              £{lpcdData.interest_to_date?.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-[#CED4DA] mb-1">
            Rate: {lpcdData.statutory_rate_pct?.toFixed(2)}% p.a.
          </div>
          <div className="text-xs text-[#CED4DA]">
            (8% + BoE {lpcdData.boe_base_rate}%)
          </div>
          <div className="text-xs text-yellow-400 mt-2">
            Accruing: £{lpcdData.daily_interest?.toFixed(2)}/day
          </div>
        </div>

        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <div className="flex justify-between items-center">
            <span className="text-white font-bold">Total Claim</span>
            <span className="text-2xl font-bold text-[#E1467C]">
              £{lpcdData.total_claim?.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            Principal + Compensation + Interest
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
        <p className="text-xs text-[#CED4DA]">
          ℹ️ UK Late Payment of Commercial Debts (Interest) Act 1998
        </p>
      </div>
    </div>
  );
}