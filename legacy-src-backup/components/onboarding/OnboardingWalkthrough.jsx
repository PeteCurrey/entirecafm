import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronRight,
  X,
  Check,
  TrendingUp,
  CreditCard,
  Megaphone,
  MessageCircle,
  FileText,
  Sparkles } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const onboardingSteps = [
{
  id: 'welcome',
  title: 'Welcome to EntireCAFM AI',
  description: 'Your intelligent facilities management platform powered by AI. Let\'s walk you through the key features.',
  icon: Sparkles,
  color: '#E41E65',
  action: null
},
{
  id: 'director',
  title: 'AI Director Dashboard',
  description: 'Your real-time operational pulse — SLA compliance, engineer utilisation, and revenue forecasts in one view.',
  icon: TrendingUp,
  color: '#10B981',
  action: 'AIDirector',
  highlight: 'Live health scoring, risk alerts, and capacity planning'
},
{
  id: 'accounts',
  title: 'AI Accounts Dashboard',
  description: 'Intelligent payment risk scoring, automated dunning sequences, and LPCD compensation calculations.',
  icon: CreditCard,
  color: '#F59E0B',
  action: 'AIAccounts',
  highlight: 'Predict which invoices will pay, automate collections'
},
{
  id: 'marketing',
  title: 'AI Marketing Dashboard',
  description: 'Track lead performance, optimize ad spend, and get AI recommendations to maximize marketing ROI.',
  icon: Megaphone,
  color: '#3B82F6',
  action: 'AIMarketing',
  highlight: 'Budget reallocation, quote optimization, conversion tracking'
},
{
  id: 'assistant',
  title: 'AI Assistant',
  description: 'Ask questions or trigger reports with text or voice. "What\'s our utilisation?" or "Generate executive brief".',
  icon: MessageCircle,
  color: '#27B3F7',
  action: 'AIAssistant',
  highlight: 'Conversational access to all your operations data'
},
{
  id: 'briefing',
  title: 'Executive Briefing',
  description: 'Every Monday at 06:00, AI generates your weekly performance report and emails it to leadership automatically.',
  icon: FileText,
  color: '#8B5CF6',
  action: 'ExecutiveBrief',
  highlight: 'Automated weekly summaries with AI recommendations'
},
{
  id: 'complete',
  title: 'System Optimised',
  description: 'You\'re all set! Start exploring your AI-powered operations platform.',
  icon: Check,
  color: '#10B981',
  action: null
}];


export default function OnboardingWalkthrough({ onComplete }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      setShowConfetti(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleNavigate = (pageName) => {
    if (pageName) {
      navigate(createPageUrl(pageName));
    }
  };

  useEffect(() => {
    if (showConfetti) {
      // Create confetti particles
      const colors = ['#E41E65', '#27B3F7', '#10B981', '#F59E0B'];
      const confettiCount = 50;

      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = 2 + Math.random() + 's';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3500);
      }
    }
  }, [showConfetti]);

  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }} className="mx-4 p-8 rounded-[14px] glass-panel-strong max-w-2xl w-full border border-[rgba(255,255,255,0.1)]">


        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#CED4DA]">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
            {!isLastStep &&
            <button
              onClick={handleSkip}
              className="text-sm text-[#CED4DA] hover:text-white transition-colors">

                Skip tour
              </button>
            }
          </div>
          <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep + 1) / onboardingSteps.length * 100}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-[#E41E65] to-[#27B3F7]" />

          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8">

            {/* Icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 magenta-glow"
              style={{ backgroundColor: `${currentStepData.color}20` }}>

              <StepIcon
                className="w-10 h-10"
                style={{ color: currentStepData.color }}
                strokeWidth={1.5} />

            </div>

            {/* Title */}
            <h2 className="text-white mb-3 text-3xl font-light">
              {currentStepData.title}
            </h2>

            {/* Description */}
            <p className="text-[#CED4DA] mb-4 text-base font-light leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Highlight Feature */}
            {currentStepData.highlight &&
            <div className="glass-panel rounded-xl p-4 border border-[#E41E65]/30 bg-[#E41E65]/5">
                <p className="text-sm text-white">
                  <Sparkles className="w-4 h-4 inline mr-2 text-[#E41E65]" />
                  {currentStepData.highlight}
                </p>
              </div>
            }

            {/* Show navigation option for module steps */}
            {currentStepData.action &&
            <Button
              onClick={() => handleNavigate(currentStepData.action)}
              variant="outline"
              className="mt-4 border-[rgba(255,255,255,0.08)] text-[#27B3F7] hover:bg-[rgba(39,179,247,0.1)]">

                Open {currentStepData.title}
                <ChevronRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </Button>
            }
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-[rgba(255,255,255,0.08)]">
          <div className="flex gap-2">
            {onboardingSteps.map((_, idx) =>
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
              idx === currentStep ?
              'bg-[#E41E65] w-8' :
              idx < currentStep ?
              'bg-[#27B3F7]' :
              'bg-[rgba(255,255,255,0.2)]'}`
              } />

            )}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && !isLastStep &&
            <Button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              variant="outline"
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]">

                Back
              </Button>
            }
            <Button
              onClick={handleNext}
              className="bg-[#E41E65] hover:bg-[#C13666] text-white magenta-glow">

              {isLastStep ?
              <>
                  <Check className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Get Started
                </> :

              <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                </>
              }
            </Button>
          </div>
        </div>
      </motion.div>
    </div>);

}