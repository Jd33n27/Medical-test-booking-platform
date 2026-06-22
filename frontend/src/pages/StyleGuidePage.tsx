import React, { useState } from 'react';

interface StyleGuidePageProps {
  onBack: () => void;
}

export const StyleGuidePage: React.FC<StyleGuidePageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'components' | 'layouts' | 'guidelines'>('colors');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const colors = [
    { name: 'Cream (Page Background)', hex: '#FAF7F2', tailwind: 'bg-brand-cream', text: 'text-brand-dark-text', desc: 'Warm sand/cream background. Used as the main backdrop color for pages.' },
    { name: 'Forest Green (Primary Color)', hex: '#1A3026', tailwind: 'bg-brand-forest', text: 'text-brand-light-text', desc: 'Primary brand organic green. Used for headers, footers, and dark container accents.' },
    { name: 'Sage (Secondary Color)', hex: '#E8EFE9', tailwind: 'bg-brand-sage', text: 'text-brand-forest', desc: 'Light sage green. Used for banner backgrounds and subtle container highlights.' },
    { name: 'Panel Cream (Light Panels)', hex: '#F3EFE7', tailwind: 'bg-brand-panel-light', text: 'text-brand-dark-text', desc: 'Medium sand background. Used inside cards and Bento-style light modules.' },
    { name: 'Terracotta (Accent Color)', hex: '#C86A51', tailwind: 'bg-brand-terracotta', text: 'text-brand-light-text', desc: 'Earthy terracotta red-orange. Used for primary calls-to-action, buttons, and verified badges.' },
    { name: 'Terracotta Hover (Accent Hover)', hex: '#B4573F', tailwind: 'bg-brand-terracotta-hover', text: 'text-brand-light-text', desc: 'Slightly deeper terracotta. Triggered dynamically for active and hover states of buttons.' },
    { name: 'Charcoal Black (Dark Text)', hex: '#14221D', tailwind: 'bg-brand-dark-text', text: 'text-brand-light-text', desc: 'Deep forest-black text. Used for main headings and high-contrast body copy.' },
    { name: 'Muted Green-Grey (Muted Text)', hex: '#4A5F56', tailwind: 'bg-brand-muted-text', text: 'text-brand-light-text', desc: 'Medium organic grey. Used for subtitles, general body text, and helper text labels.' },
    { name: 'Sand White (Light Text)', hex: '#F7F5F0', tailwind: 'bg-brand-light-text', text: 'text-brand-dark-text', desc: 'Off-white text. Used for high contrast readability against dark forest green backgrounds.' },
    { name: 'Warm Border Light', hex: '#DCD5CB', tailwind: 'bg-brand-border', text: 'text-brand-dark-text', desc: 'Light border separator. Used to frame containers and divide list elements on light screens.' },
    { name: 'Warm Border Dark', hex: '#2A4237', tailwind: 'bg-brand-border-dark', text: 'text-brand-light-text', desc: 'Dark border separator. Used inside forest green panels to separate elements.' },
  ];

  const typographyScales = [
    { 
      tag: 'h1', 
      name: 'Hero Heading (Heading 1)', 
      specs: 'Desktop: 48px | Tablet: 36px | Mobile: 30px (Weight: 800 Extra Bold / Letter Spacing: Tight)', 
      sample: 'Smart medical bookings in seconds' 
    },
    { 
      tag: 'h2', 
      name: 'Section Heading (Heading 2)', 
      specs: 'Desktop: 30px | Tablet: 24px | Mobile: 20px (Weight: 700 Bold / Letter Spacing: Tight)', 
      sample: 'Select by Health Concern' 
    },
    { 
      tag: 'h3', 
      name: 'Card / Module Title (Heading 3)', 
      specs: 'Desktop: 20px | Tablet: 18px (Weight: 700 Bold)', 
      sample: 'Comprehensive Metabolic Panel (CMP)' 
    },
    { 
      tag: 'h4', 
      name: 'Item Title / Card Subheading (Heading 4)', 
      specs: 'Desktop: 18px | Tablet: 16px (Weight: 700 Bold)', 
      sample: 'Lagos Diagnostic Laboratory' 
    },
    { 
      tag: 'body-lg', 
      name: 'Body Text Large', 
      specs: 'Desktop: 18px | Tablet: 16px (Weight: 400 Regular)', 
      sample: 'Compare prices across top certified laboratories. Schedule clinic visits instantly with zero hassle.' 
    },
    { 
      tag: 'body-md', 
      name: 'Body Text Default', 
      specs: 'Desktop: 16px | Mobile: 14px (Weight: 400 Regular)', 
      sample: 'Patient results will be sent directly to your secure health vault within 24 hours of sample receipt.' 
    },
    { 
      tag: 'body-sm', 
      name: 'Body Details / Metadata', 
      specs: 'Desktop: 12px (Weight: 500 Medium)', 
      sample: 'Disclaimer: Diagnostics are conducted by third-party registered laboratories.' 
    },
    { 
      tag: 'badge', 
      name: 'Overline Badge Text', 
      specs: 'Desktop: 12px | Mobile: 10px (Weight: 700 Bold / Case: Uppercase / Letter Spacing: Wide)', 
      sample: 'PATIENT VAULT' 
    },
  ];

  const layoutSizes = [
    { title: 'Maximum Page Width', val: '1280px', desc: 'The maximum outer alignment width of the site content wrapper (Header, Footer, Main Content).' },
    { title: 'Section Separation Spacing', val: '40px', desc: 'Standard vertical spacing used to separate layout components and content groups.' },
    { title: 'Bento Grid Separation Spacing', val: '24px', desc: 'Standard spacing gap between elements in grid lists (Laboratories, Concerns, and Test modules).' },
    { title: 'Large Radius (Hero / Modals)', val: '24px', desc: 'Soft corner rounding used for top-level callout banners, heroes, and pop-up dialog boxes.' },
    { title: 'Medium Radius (Cards / Sections)', val: '16px', desc: 'Standard corner rounding used for general components like Laboratory cards and Test detail panels.' },
    { title: 'Small Radius (Buttons / Inputs)', val: '12px', desc: 'Corner rounding used for functional interactive elements, textfields, dropdown select boxes, and action buttons.' },
    { title: 'Extra-Small Radius (Status Chips)', val: '8px', desc: 'Corner rounding used for tags, chips, indicator alerts, or capsules.' },
  ];

  const paddings = [
    { label: 'Tiny Padding', size: '8px', desc: 'Used for tight text grouping, button inner icon spacing, and tag padding.' },
    { label: 'Small Padding', size: '16px', desc: 'Standard inner padding for cards, search inputs, and mobile list components.' },
    { label: 'Medium Padding', size: '24px', desc: 'Inner padding for primary desktop panels, bento-grid modules, and medium banners.' },
    { label: 'Large Padding', size: '32px / 48px', desc: 'Inner spacing for large layouts, section heroes, and top-level landing pages.' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Toast feedback for clipboard */}
      {copiedText && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-forest text-brand-light-text border border-brand-border-dark px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <svg className="w-4 h-4 text-brand-terracotta shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-bold tracking-wide">Copied Color: <span className="text-brand-terracotta">{copiedText}</span></span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-sage p-6 sm:p-8 md:p-10 border border-brand-border/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-forest/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-terracotta/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <button 
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-forest hover:text-brand-terracotta transition-colors group cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-dark-text">
              MedBook <span className="text-brand-terracotta">Design System</span>
            </h1>
            <p className="text-brand-muted-text text-sm sm:text-base">
              A comprehensive visual resource for UX researchers and product designers. Review the brand color palette, typographic hierarchy, container sizes, and design specs.
            </p>
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-brand-forest hover:bg-brand-forest/90 text-brand-light-text transition-all cursor-pointer shadow-md shrink-0 self-start md:self-auto"
          >
            Launch Main App
          </button>
        </div>
      </section>

      {/* Tabs Menu */}
      <div className="border-b border-brand-border flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {[
          { id: 'colors', label: 'Color Palette' },
          { id: 'typography', label: 'Typography Scale' },
          { id: 'components', label: 'Interactive UI Elements' },
          { id: 'layouts', label: 'Layout & Spacing' },
          { id: 'guidelines', label: 'Design Guidelines' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'border-brand-terracotta text-brand-terracotta' 
                : 'border-transparent text-brand-muted-text hover:text-brand-dark-text hover:border-brand-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* COLORS SECTION */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-dark-text mb-1">Color Palette</h2>
            <p className="text-sm text-brand-muted-text">Our product uses a nature-inspired palette (Warm creams, Forest greens, and Terracotta). Click any color swatch below to copy its HEX code to your clipboard for Figma.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colors.map((c) => (
              <div 
                key={c.name} 
                className="bg-brand-panel-light border border-brand-border rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => copyToClipboard(c.hex, c.name)}
                title={`Click to copy HEX: ${c.hex}`}
              >
                {/* Visual Swatch */}
                <div className={`h-28 ${c.tailwind} w-full flex items-end p-3 relative`}>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg">
                      Copy HEX
                    </span>
                  </div>
                  <span className={`text-xs font-black tracking-widest px-2.5 py-1 rounded bg-black/10 backdrop-blur-sm ${c.text}`}>
                    {c.hex}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <h3 className="font-extrabold text-sm text-brand-dark-text">{c.name}</h3>
                  <p className="text-xs text-brand-muted-text leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Gradients & Transparency */}
          <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-4">
            <h3 className="font-bold text-base text-brand-dark-text">Brand Gradients & Layer Styles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-brand-cream border border-brand-border p-4 rounded-xl flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted-text mb-1">Text Accent Gradient</h4>
                  <span className="gradient-text font-black text-2xl tracking-tight">MedBook Diagnostics</span>
                </div>
                <p className="text-xs text-brand-muted-text leading-relaxed">
                  Linear Gradient: 135-degree angle, transitioning from Forest Green (#1A3026) at 0% to Terracotta (#C86A51) at 100%. Use for high-emphasis headlines.
                </p>
              </div>

              <div className="bg-brand-forest p-4 rounded-xl flex flex-col justify-between gap-4 border border-brand-border-dark">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-light-text/60 mb-1">Frosted Glass Blend</h4>
                  <span className="text-brand-cream font-bold text-sm bg-brand-cream/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-brand-border-dark/40 inline-block">
                    Glass Navigation Block
                  </span>
                </div>
                <p className="text-xs text-brand-light-text/75 leading-relaxed">
                  Opacity Mix: 90% opacity overlay of Cream (#FAF7F2) layered with a blur filter. Used for the sticky header navigation container.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TYPOGRAPHY SECTION */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-dark-text mb-1">Typography Hierarchy</h2>
            <p className="text-sm text-brand-muted-text">The product uses the <strong>Inter</strong> typeface. Below is the text size hierarchy for layouts across responsive screen resolutions.</p>
          </div>

          <div className="bg-brand-panel-light border border-brand-border rounded-2xl divide-y divide-brand-border/40">
            {typographyScales.map((s) => (
              <div key={s.tag} className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-brand-cream/30 transition-all">
                {/* Size description */}
                <div className="space-y-1 lg:max-w-md shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded uppercase">
                      {s.tag}
                    </span>
                    <h3 className="font-extrabold text-xs text-brand-dark-text uppercase tracking-wider">{s.name}</h3>
                  </div>
                  <p className="text-xs text-brand-muted-text font-semibold">{s.specs}</p>
                </div>

                {/* Previews */}
                <div className="flex-grow py-2">
                  <span className="text-xs text-brand-muted-text/50 uppercase tracking-widest block mb-1">Visual Preview</span>
                  {s.tag === 'h1' && <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-brand-dark-text">{s.sample}</h1>}
                  {s.tag === 'h2' && <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-dark-text">{s.sample}</h2>}
                  {s.tag === 'h3' && <h3 className="text-lg sm:text-xl font-bold text-brand-dark-text">{s.sample}</h3>}
                  {s.tag === 'h4' && <h4 className="text-base sm:text-lg font-bold text-brand-dark-text">{s.sample}</h4>}
                  {s.tag === 'body-lg' && <p className="text-base sm:text-lg text-brand-muted-text">{s.sample}</p>}
                  {s.tag === 'body-md' && <p className="text-sm sm:text-base text-brand-muted-text">{s.sample}</p>}
                  {s.tag === 'body-sm' && <p className="text-xs text-brand-muted-text font-medium">{s.sample}</p>}
                  {s.tag === 'badge' && <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none text-brand-dark-text">{s.sample}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Typography Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-3">
              <h3 className="font-bold text-base text-brand-dark-text">Typographic Best Practices</h3>
              <ul className="text-xs sm:text-sm text-brand-muted-text space-y-2 list-disc list-inside">
                <li>Headlines: Tighten letter tracking (Tracking: -2%) on Heading 1 and Heading 2 items to ensure clean density in large sizes.</li>
                <li>Overline Badges: Always set metadata overline labels in full uppercase with wide letter spacing (Tracking: +10%) to contrast readability.</li>
                <li>Body Copy Line Spacing (Leading): Body text should use a line height factor of 1.5x (150%) to ensure clean reading vertical paths.</li>
                <li>Font Weights in Figma: Limit designs to Regular (400), Medium (500), Bold (700), and Extra Bold (800) to keep the loading footprint light.</li>
              </ul>
            </div>

            <div className="p-6 bg-brand-forest text-brand-light-text border border-brand-border-dark rounded-2xl space-y-3">
              <h3 className="font-bold text-base text-brand-cream">Font Weights in MedBook</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-brand-muted-text/80 uppercase text-[9px] tracking-widest block font-bold">Regular (400)</span>
                  <span className="font-normal text-lg">General reading paragraphs</span>
                </div>
                <div className="space-y-1">
                  <span className="text-brand-muted-text/80 uppercase text-[9px] tracking-widest block font-bold">Medium (500)</span>
                  <span className="font-medium text-lg">Secondary subtexts / details</span>
                </div>
                <div className="space-y-1">
                  <span className="text-brand-muted-text/80 uppercase text-[9px] tracking-widest block font-bold">Bold (700)</span>
                  <span className="font-bold text-lg">Buttons, metadata, card titles</span>
                </div>
                <div className="space-y-1">
                  <span className="text-brand-muted-text/80 uppercase text-[9px] tracking-widest block font-bold">Extra Bold (800)</span>
                  <span className="font-extrabold text-lg">Primary landing hero headings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTS SECTION */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-dark-text mb-1">Interactive UI Components</h2>
            <p className="text-sm text-brand-muted-text">A preview of standard visual assets, form elements, and status badges designed for the user interface.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* BUTTONS PREVIEW */}
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-6">
              <h3 className="font-bold text-base text-brand-dark-text border-b border-brand-border/60 pb-2">Button Assets</h3>
              
              <div className="space-y-4">
                {/* Primary Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-brand-muted-text uppercase">Primary Action Button</span>
                    <p className="text-xs text-brand-muted-text">Terracotta fill, off-white text. Used for main conversions.</p>
                  </div>
                  <button className="px-5 py-2.5 text-sm font-bold rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text transition-colors cursor-pointer">
                    Book Appointment
                  </button>
                </div>

                {/* Secondary Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-brand-border/40 pt-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-brand-muted-text uppercase">Secondary Navigation Button</span>
                    <p className="text-xs text-brand-muted-text">Cream fill, warm border, Forest green text. Used for back/cancel actions.</p>
                  </div>
                  <button className="px-5 py-2.5 text-sm font-bold rounded-xl bg-brand-cream border border-brand-border text-brand-forest hover:bg-brand-sage transition-all cursor-pointer">
                    Back to Portal
                  </button>
                </div>

                {/* Status Trigger Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-brand-border/40 pt-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-brand-muted-text uppercase">Small Action Trigger</span>
                    <p className="text-xs text-brand-muted-text">Used in headers and profile action buttons.</p>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-all flex items-center gap-1.5 cursor-pointer">
                    <svg className="w-3.5 h-3.5 text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Secure Chat</span>
                  </button>
                </div>

                {/* Caution Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-brand-border/40 pt-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-brand-muted-text uppercase">Destructive State Button</span>
                    <p className="text-xs text-brand-muted-text">Rose transparent bg, red text. Used for sign-out or account deletion.</p>
                  </div>
                  <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BADGES & CHIPS */}
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-6">
              <h3 className="font-bold text-base text-brand-dark-text border-b border-brand-border/60 pb-2">Badges, Icons & Status Chips</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Verification Badge */}
                <div className="bg-brand-cream border border-brand-border p-3 rounded-xl flex flex-col justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted-text">Verified Lab Badge</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-brand-dark-text">Verified Lab</span>
                    <svg className="w-4 h-4 text-brand-terracotta shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Location Badge */}
                <div className="bg-brand-cream border border-brand-border p-3 rounded-xl flex flex-col justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted-text">Active Location</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-brand-dark-text">
                    <span className="w-1.5 h-1.5 bg-brand-terracotta rounded-full animate-pulse mr-1"></span>
                    Lagos, Nigeria
                  </div>
                </div>

                {/* Spotlight Tag */}
                <div className="bg-brand-cream border border-brand-border p-3 rounded-xl flex flex-col justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted-text">Smart Spotlight tag</span>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-brand-forest border border-brand-border/60">
                      <span className="w-1 h-1 rounded-full bg-brand-terracotta"></span>
                      Smart Match
                    </span>
                  </div>
                </div>

                {/* Category Concern Tag */}
                <div className="bg-brand-cream border border-brand-border p-3 rounded-xl flex flex-col justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted-text">Health Concern Card</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-brand-sage text-brand-forest flex items-center justify-center text-xs font-bold font-emoji">
                      🩸
                    </div>
                    <span className="text-xs font-bold text-brand-dark-text">Diabetes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM INPUTS */}
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-6">
              <h3 className="font-bold text-base text-brand-dark-text border-b border-brand-border/60 pb-2">Form Controls</h3>
              
              <div className="space-y-4">
                {/* Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-brand-dark-text">Full Name Input</label>
                  <input 
                    type="text" 
                    placeholder="Enter patient full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-cream text-brand-dark-text text-sm focus:outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest/30 transition-all font-medium"
                    defaultValue="Chioma Adebayo"
                    readOnly
                  />
                </div>

                {/* Search Bar Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-brand-dark-text">Search Field</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search for malaria, kidney profile, etc."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-brand-cream text-brand-dark-text text-sm focus:outline-none focus:border-brand-forest/60 transition-all font-medium"
                      readOnly
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Dropdown Input Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-brand-dark-text">Select Dropdown Menu</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-cream text-brand-dark-text text-sm focus:outline-none focus:border-brand-forest/60 transition-all font-bold cursor-pointer" disabled>
                    <option>All Laboratories</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BENTO CONTAINER BLOCKS */}
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-brand-dark-text border-b border-brand-border/60 pb-2">Bento Layout Containers</h3>
              
              <div className="space-y-4">
                {/* Light Bento Card */}
                <div className="bento-panel-light p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-brand-terracotta tracking-wider uppercase">Bento Card (Light Option)</span>
                    <span className="text-xs font-black text-brand-forest">₦24,500</span>
                  </div>
                  <h4 className="font-bold text-sm text-brand-dark-text">Thyroid Profile (T3, T4, TSH)</h4>
                  <p className="text-xs text-brand-muted-text leading-relaxed font-normal">Full check of thyroid hormones to identify hyper/hypo activity.</p>
                </div>

                {/* Dark Bento Card */}
                <div className="bento-panel-dark p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-brand-sage tracking-wider uppercase">Bento Card (Dark Option)</span>
                    <span className="text-[10px] font-bold text-brand-light-text/60">ACTIVE VAULT</span>
                  </div>
                  <h4 className="font-bold text-sm text-brand-light-text">Smart Diagnostics Cloud</h4>
                  <p className="text-xs text-brand-light-text/80 leading-relaxed font-normal">All results are encrypted and hosted inside Nigeria's secure medical registry nodes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUTS & SIZES SECTION */}
      {activeTab === 'layouts' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-dark-text mb-1">Layout Spacing & Dimensions</h2>
            <p className="text-sm text-brand-muted-text">Detailed specifications on structural layouts, grids, rounding (radii), and padding dimensions to establish geometric alignment.</p>
          </div>

          {/* Dimension Specifications Table */}
          <div className="bg-brand-panel-light border border-brand-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-brand-sage/60 border-b border-brand-border">
              <h3 className="font-bold text-xs sm:text-sm text-brand-forest uppercase tracking-wider">Outer Dimensions & Radii Scale</h3>
            </div>
            <div className="divide-y divide-brand-border/40">
              {layoutSizes.map((sz, idx) => (
                <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-brand-cream/30 transition-all">
                  <div className="space-y-0.5 max-w-lg">
                    <h4 className="font-extrabold text-sm text-brand-dark-text">{sz.title}</h4>
                    <p className="text-xs text-brand-muted-text leading-relaxed">{sz.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-brand-forest bg-brand-cream border border-brand-border/60 px-3.5 py-1.5 rounded-lg inline-block">
                      {sz.val}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Padding Scale */}
          <div className="bg-brand-panel-light border border-brand-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-brand-sage/60 border-b border-brand-border">
              <h3 className="font-bold text-xs sm:text-sm text-brand-forest uppercase tracking-wider">Padding & Spacing Margins</h3>
            </div>
            <div className="divide-y divide-brand-border/40">
              {paddings.map((p, idx) => (
                <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-brand-cream/30 transition-all">
                  <div className="space-y-0.5 max-w-lg">
                    <h4 className="font-extrabold text-sm text-brand-dark-text">{p.label}</h4>
                    <p className="text-xs text-brand-muted-text leading-relaxed">{p.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-brand-forest bg-brand-cream border border-brand-border/60 px-3.5 py-1.5 rounded-lg inline-block">
                      {p.size}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Grid Demonstration */}
          <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-4">
            <h3 className="font-bold text-base text-brand-dark-text">Visual Spacing Scale (Figma Reference)</h3>
            <p className="text-xs text-brand-muted-text">Design elements should snap to these horizontal/vertical padding intervals:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="p-2 border border-brand-border bg-brand-cream rounded-xl">
                <span className="block text-[10px] text-brand-muted-text/60 font-bold uppercase tracking-wider">Tiny Gap</span>
                <span className="text-xs font-bold text-brand-forest">8px Padding</span>
              </div>
              <div className="p-4 border border-brand-border bg-brand-cream rounded-xl">
                <span className="block text-[10px] text-brand-muted-text/60 font-bold uppercase tracking-wider">Small Gap</span>
                <span className="text-xs font-bold text-brand-forest">16px Padding</span>
              </div>
              <div className="p-6 border border-brand-border bg-brand-cream rounded-xl">
                <span className="block text-[10px] text-brand-muted-text/60 font-bold uppercase tracking-wider">Medium Gap</span>
                <span className="text-xs font-bold text-brand-forest">24px Padding</span>
              </div>
              <div className="p-8 border border-brand-border bg-brand-cream rounded-xl">
                <span className="block text-[10px] text-brand-muted-text/60 font-bold uppercase tracking-wider">Large Gap</span>
                <span className="text-xs font-bold text-brand-forest">32px Padding</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UX/UI DESIGN GUIDELINES */}
      {activeTab === 'guidelines' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-dark-text mb-1">UX/UI Designer Guidelines</h2>
            <p className="text-sm text-brand-muted-text">Mandatory layout rules, user flow best practices, accessibility standards, and copywriting guidelines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accessibility and Usability Card */}
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-brand-dark-text flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-forest animate-pulse"></span>
                Accessibility & Readability
              </h3>
              
              <ul className="text-xs sm:text-sm text-brand-muted-text space-y-3 list-disc list-inside">
                <li>
                  <strong className="text-brand-dark-text">Contrast Standards:</strong> Heading titles must always render in Charcoal Black (#14221D) against light backgrounds. This creates a high contrast ratio exceeding 8.5:1, ensuring comfortable reading for visually impaired patients.
                </li>
                <li>
                  <strong className="text-brand-dark-text">Interactive Hit Area:</strong> Reusable clickable items (buttons, selects, textfields) require a height of at least 40px (preferably 44px) to conform with standard mobile viewport tap target guidelines.
                </li>
                <li>
                  <strong className="text-brand-dark-text">Flipped States:</strong> Always frame card content with a thin 1px border separator in Warm Border Light (#DCD5CB) to delineate cards for users with color vision deficiencies.
                </li>
                <li>
                  <strong className="text-brand-dark-text">Accessibility Focus:</strong> Active input elements require clear outer ring outlines on focus states, assisting keyboard navigation flows.
                </li>
              </ul>
            </div>

            {/* Layout and copy guidelines card */}
            <div className="p-6 bg-brand-panel-light border border-brand-border rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-brand-dark-text flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-terracotta"></span>
                Alignment & Brand Voice
              </h3>
              
              <ul className="text-xs sm:text-sm text-brand-muted-text space-y-3 list-disc list-inside">
                <li>
                  <strong className="text-brand-dark-text">Responsive Breakpoints:</strong> Build layout configurations around standard screen widths: Mobile (below 640px), Tablet (768px), and Desktop (1024px and above).
                </li>
                <li>
                  <strong className="text-brand-dark-text">Outer Grid Margin:</strong> Every page layout template requires default outer side margins of 16px (on mobile viewports) up to 24px (on desktop screens) to create consistent framing.
                </li>
                <li>
                  <strong className="text-brand-dark-text">Bento Grid Flow:</strong> Do not overcrowd modules. Use vertical spacing gaps of 24px between modules to preserve visual hierarchy and breathing room.
                </li>
                <li>
                  <strong className="text-brand-dark-text">Copy & Tone:</strong> Use direct, concise, and helpful copy. Keep technical medical diagnostic terminology clean, and provide clear descriptions (e.g. tooltips) for medical indicators.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
