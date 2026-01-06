import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already authenticated, redirect to dashboard
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          navigate(createPageUrl("Dashboard"));
        }
      } catch (error) {
        // User not authenticated, show landing page
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-[45%] bg-[#0D1117] flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo & Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center magenta-glow-strong">
                <Wrench className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  ENTIRE<span className="text-[#E1467C]">CAFM</span>
                </h1>
                <p className="text-xs text-[#8B949E] uppercase tracking-wider">AI-Powered Operations</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-white leading-tight">
              Welcome Back
            </h2>
            <p className="text-[#CED4DA] text-lg">
              Sign in to access your intelligent facility management platform
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4 py-6">
            {[
              'Real-time job tracking & engineer dispatch',
              'AI-driven insights & forecasting',
              'Client portal & automated workflows',
              'Compliance tracking & ESG metrics'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E1467C]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#E1467C]" />
                </div>
                <p className="text-[#CED4DA] text-sm">{feature}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-4 pt-4">
            <Button
              onClick={handleLogin}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#E41E65] to-[#C13666] hover:from-[#F02570] hover:to-[#D13E70] text-white rounded-xl magenta-glow transition-all group"
            >
              Sign In
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(255,255,255,0.1)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#0D1117] text-[#8B949E]">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-14 text-lg font-semibold glass-panel border-[rgba(255,255,255,0.1)] text-white hover:border-[rgba(255,255,255,0.2)] rounded-xl"
            >
              Request Access
            </Button>
          </div>

          {/* Footer */}
          <div className="pt-8 text-center">
            <p className="text-sm text-[#8B949E]">
              Enterprise facility management reimagined with AI
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1117]/40 via-transparent to-[#E41E65]/20 z-10" />
        
        {/* London Cityscape */}
        <img
          src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2000&auto=format&fit=crop"
          alt="London Cityscape"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Floating Stats Card */}
        <div className="absolute bottom-12 left-12 right-12 z-20">
          <div className="glass-panel-strong rounded-2xl p-8 border border-[rgba(255,255,255,0.15)] backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">99.8%</div>
                <div className="text-sm text-[#CED4DA]">Uptime</div>
              </div>
              <div className="text-center border-l border-r border-[rgba(255,255,255,0.1)]">
                <div className="text-4xl font-bold text-white mb-2">10k+</div>
                <div className="text-sm text-[#CED4DA]">Jobs Managed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">24/7</div>
                <div className="text-sm text-[#CED4DA]">AI Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quote/Tagline */}
        <div className="absolute top-12 left-12 right-12 z-20">
          <div className="glass-panel-strong rounded-2xl p-6 border border-[rgba(255,255,255,0.15)] backdrop-blur-xl max-w-md">
            <p className="text-white text-xl font-semibold mb-2">
              "The future of facility management"
            </p>
            <p className="text-[#CED4DA] text-sm">
              Transform operations with real-time intelligence and predictive insights
            </p>
          </div>
        </div>

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-20 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#E41E65] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#27B3F7] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}