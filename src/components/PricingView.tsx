import React, { useState } from 'react';
import { Check, Cloud, HardDrive, ShieldCheck } from 'lucide-react';

interface PricingViewProps {
  onReturnToEditor: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onReturnToEditor }) => {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'team'>('free');
  const [statusNote, setStatusNote] = useState<string | null>(null);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-purple-400">
              SaaS Architecture · Local-First + Optional Cloud Sync
            </p>
            <h1 className="font-display text-3xl font-bold text-white">
              Plans & Cloud Workspace Tiers
            </h1>
            <p className="max-w-2xl text-sm text-slate-400">
              ClipForge runs 100% locally in your browser for free. Upgrade when your team
              needs Firebase Cloud Project Sync, shared brand kits, and multi-device timelines.
            </p>
          </div>
          <button
            type="button"
            onClick={onReturnToEditor}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>

        {statusNote && (
          <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 px-4 py-3 text-xs text-purple-200 flex items-center justify-between">
            <span>{statusNote}</span>
            <button
              type="button"
              onClick={() => setStatusNote(null)}
              className="text-purple-300 underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pricing Comparison Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Free Tier */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-400">For solo creators</p>
                <h2 className="font-display text-xl font-bold text-white mt-1">
                  Free Local Studio
                </h2>
              </div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-xs text-slate-400">/ forever</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete on-device WebAssembly editing with zero watermarks and complete file
                privacy.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>480p, 720p & 1080p MP4 Export</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Image + Audio to Video Slideshow</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Trim, Crop, Mute & Audio Mixing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Fade In/Out, RGB Glitch & Color Filters</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPlan('free');
                setStatusNote('Free Local Studio is active on your browser.');
              }}
              className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                selectedPlan === 'free'
                  ? 'bg-slate-800 text-white border border-purple-500/40'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {selectedPlan === 'free' ? 'Current Active Plan' : 'Switch to Free'}
            </button>
          </div>

          {/* Pro Cloud Tier */}
          <div className="flex flex-col justify-between rounded-2xl border border-purple-500/60 bg-slate-900/90 p-6 space-y-6 shadow-xl">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-purple-400">
                  For multi-device editors
                </p>
                <h2 className="font-display text-xl font-bold text-white mt-1">
                  Pro Cloud Studio
                </h2>
              </div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-3xl font-bold text-white">$12</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sync non-linear project timelines across PC and mobile with Firebase Auth &
                Firestore cloud project storage.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Everything in Free Local Studio</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>50 GB Cloud Project & Asset Backup</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Custom Brand Fonts & LUT Presets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Cross-Device Timeline Continuation</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPlan('pro');
                setStatusNote(
                  'Pro Cloud Studio preview selected. Connect Firebase Auth & Firestore in Settings when deploying to production.'
                );
              }}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-semibold text-white hover:from-purple-500 hover:to-pink-500"
            >
              {selectedPlan === 'pro' ? 'Selected (Preview Mode)' : 'Select Pro Plan'}
            </button>
          </div>

          {/* Team Tier */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-pink-400">
                  For content agencies
                </p>
                <h2 className="font-display text-xl font-bold text-white mt-1">
                  Team Studio
                </h2>
              </div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-3xl font-bold text-white">$29</span>
                <span className="text-xs text-slate-400">/ seat / month</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collaborative project folders, shared audio libraries, and role-based review
                links.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-400 shrink-0" />
                  <span>250 GB Shared Firestore + Storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-400 shrink-0" />
                  <span>Shared Intro/Outro Slide Templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-400 shrink-0" />
                  <span>Team Member Access Controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-400 shrink-0" />
                  <span>Priority WebAssembly Worker Threads</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPlan('team');
                setStatusNote(
                  'Team Studio tier selected. Ready for multi-tenant Firestore workspace integration.'
                );
              }}
              className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                selectedPlan === 'team'
                  ? 'bg-slate-800 text-white border border-pink-500/40'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {selectedPlan === 'team' ? 'Selected (Preview Mode)' : 'Select Team Plan'}
            </button>
          </div>
        </div>

        {/* Architecture Readiness Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4 border-t border-slate-800">
          <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
            <HardDrive className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h3 className="font-semibold text-white">Zero-Upload Processing</h3>
              <p className="text-slate-400">
                Raw video frames never leave the user&apos;s browser memory.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
            <Cloud className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h3 className="font-semibold text-white">Firestore Project Schema</h3>
              <p className="text-slate-400">
                EditorState serializes cleanly to JSON for future cloud project saving.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h3 className="font-semibold text-white">Single-Thread WASM</h3>
              <p className="text-slate-400">
                Runs on any static host without requiring COOP/COEP headers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
