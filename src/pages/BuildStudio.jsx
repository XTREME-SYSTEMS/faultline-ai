import { useState, useEffect } from 'react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import Stepper from '@/components/build-studio/Stepper';
import StepType from '@/components/build-studio/StepType';
import StepName from '@/components/build-studio/StepName';
import StepBrand from '@/components/build-studio/StepBrand';
import StepBuild from '@/components/build-studio/StepBuild';

const defaultForm = {
    buildType: 'website',
    appType: 'dashboard',
    business_name: '', industry: '', domain: '',
    description: '', target_audience: '',
    primary_color: '#C89B3C', secondary_color: '#0a0a0a', accent_color: '',
    bg_color: '', font_color: '',
    font_style: 'modern', font_heading: '', font_body: '',
    tone: 'professional', logo_url: '', tagline: '',
    pages: [], features: [],
  };

export default function BuildStudio() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('buildStudioForm');
      if (saved) return { ...defaultForm, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultForm;
  });

  useEffect(() => {
    try { localStorage.setItem('buildStudioForm', JSON.stringify(form)); } catch (e) {}
  }, [form]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const next = () => setStep(s => Math.min(3, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, transition: 'margin .3s' }}>
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
        }}>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Xtreme Clone System</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
            Build<span style={{ color: '#E7C86E' }}>Studio</span>
          </h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>One workflow — pick your type, name it, brand it, build it. Top to bottom.</p>
        </div>

        <Stepper step={step} />

        {step === 0 && <StepType form={form} update={update} next={next} />}
        {step === 1 && <StepName form={form} update={update} next={next} back={back} />}
        {step === 2 && <StepBrand form={form} update={update} next={next} back={back} />}
        {step === 3 && <StepBuild form={form} update={update} back={back} />}
      </div>
    </>
  );
}