import { useState } from "react";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import axios from "axios";

interface Plan {
  id: string;
  name: string;
  monthly_usd: number;
  annual_usd: number;
  companies: number;
  requests: string;
  features: string[];
  highlight: boolean;
}

interface Props {
  companyId?: number;
  companyEmail?: string;
}

const ICONS: Record<string, React.ReactNode> = {
  starter:    <Zap size={22} />,
  growth:     <Rocket size={22} />,
  enterprise: <Building2 size={22} />,
};

const PLANS_STATIC: Plan[] = [
  {
    id: "starter", name: "Starter", monthly_usd: 49, annual_usd: 39,
    companies: 5, requests: "10M / month",
    features: ["Response caching", "Smart model routing", "OpenAI + Anthropic + Google", "Real-time dashboard", "Budget alerts"],
    highlight: false,
  },
  {
    id: "growth", name: "Growth", monthly_usd: 149, annual_usd: 119,
    companies: 25, requests: "100M / month",
    features: ["Everything in Starter", "25 companies", "Priority support", "CSV export", "Webhook alerts"],
    highlight: true,
  },
  {
    id: "enterprise", name: "Enterprise", monthly_usd: 499, annual_usd: 399,
    companies: -1, requests: "Unlimited",
    features: ["Everything in Growth", "Unlimited companies", "SLA guarantee", "SSO / SAML", "Dedicated Slack support"],
    highlight: false,
  },
];

export default function PricingPage({ companyId, companyEmail }: Props) {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!companyId || !companyEmail) {
      alert("Please select a company first (Companies tab) before subscribing.");
      return;
    }
    setLoading(plan.id);
    try {
      const { data } = await axios.post("/api/billing/checkout", {
        plan: plan.id,
        billing: annual ? "annual" : "monthly",
        company_id: companyId,
        customer_email: companyEmail,
      });
      window.location.href = data.url;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(msg ?? "Stripe not configured yet — add price IDs to backend/.env");
    } finally {
      setLoading(null);
    }
  };

  const annualSavings = (p: Plan) => Math.round((1 - p.annual_usd / p.monthly_usd) * 100);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-white">Simple, transparent pricing</h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Pay a flat fee. Save 10–30% on your AI API bills automatically.
          Average customer saves <span className="text-emerald-400 font-semibold">$1,400/month</span> per $10k AI spend.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className={`text-sm font-medium ${!annual ? "text-white" : "text-gray-500"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-indigo-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${annual ? "left-7" : "left-1"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-white" : "text-gray-500"}`}>
            Annual <span className="text-emerald-400 ml-1">Save up to 20%</span>
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS_STATIC.map(plan => (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-6 flex flex-col gap-5 border transition
              ${plan.highlight
                ? "bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10"
                : "bg-gray-900 border-gray-800"}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
            )}

            {/* Plan header */}
            <div className="flex items-center gap-2 text-indigo-400">
              {ICONS[plan.id]}
              <span className="font-semibold text-gray-200 text-lg">{plan.name}</span>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white">
                  ${annual ? plan.annual_usd : plan.monthly_usd}
                </span>
                <span className="text-gray-400 mb-1">/mo</span>
              </div>
              {annual && (
                <p className="text-emerald-400 text-xs mt-1">
                  Save {annualSavings(plan)}% vs monthly · billed ${plan.annual_usd * 12}/yr
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                {plan.companies === -1 ? "Unlimited companies" : `Up to ${plan.companies} companies`}
                {" · "}{plan.requests}
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loading === plan.id}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition
                ${plan.highlight
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"}`}
            >
              {loading === plan.id ? "Redirecting…" : "Get started"}
            </button>

            {/* Features */}
            <ul className="space-y-2 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                  <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Free tier note */}
      <div className="text-center space-y-2">
        <p className="text-gray-500 text-sm">
          Need to try first?{" "}
          <span className="text-gray-300 font-medium">The self-hosted version is always free.</span>{" "}
          Subscriptions unlock the hosted, managed service.
        </p>
        <p className="text-gray-600 text-xs">
          All plans include a 14-day free trial · Cancel anytime · No setup fees
        </p>
      </div>

      {/* ROI calculator teaser */}
      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-gray-200 font-semibold mb-4 text-center">💰 Quick ROI estimate</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { spend: "$1k/mo AI spend",  saving: "~$140/mo saved",  plan: "Starter ($49)", net: "+$91/mo net" },
            { spend: "$5k/mo AI spend",  saving: "~$700/mo saved",  plan: "Growth ($149)",  net: "+$551/mo net" },
            { spend: "$20k/mo AI spend", saving: "~$2,800/mo saved", plan: "Enterprise ($499)", net: "+$2,301/mo net" },
          ].map(r => (
            <div key={r.spend} className="bg-gray-800/50 rounded-xl p-4 space-y-1">
              <p className="text-gray-400 text-xs">{r.spend}</p>
              <p className="text-emerald-400 text-sm font-semibold">{r.saving}</p>
              <p className="text-gray-500 text-xs">{r.plan}</p>
              <p className="text-white text-xs font-bold">{r.net}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
