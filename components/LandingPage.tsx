
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  Globe2, 
  Users2, 
  ArrowRight, 
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  Scale,
  Calculator,
  Briefcase
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem('unsg_session');
    if (session) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const services = [
    {
      title: "Audit & Assurance",
      description: "Rigorous and objective auditing services providing transparency and trust in financial reporting.",
      icon: <ShieldCheck className="text-emerald-600" size={24} />
    },
    {
      title: "Legal Consulting",
      description: "Comprehensive legal advice across corporate, commercial, and regulatory environments in the MENA region.",
      icon: <Scale className="text-emerald-600" size={24} />
    },
    {
      title: "Tax Advisory",
      description: "Strategic tax planning and compliance services tailored to local regulations and international standards.",
      icon: <Calculator className="text-emerald-600" size={24} />
    },
    {
      title: "Business Advisory",
      description: "Expert guidance on market entry, mergers & acquisitions, and organizational restructuring.",
      icon: <Briefcase className="text-emerald-600" size={24} />
    }
  ];

  const locations = [
    { city: "Doha", country: "Qatar" },
    { city: "Dubai", country: "UAE" },
    { city: "Kuwait City", country: "Kuwait" },
    { city: "Muscat", country: "Oman" },
    { city: "Amman", country: "Jordan" }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://raw.githubusercontent.com/AnasQandeel/RPME-Logo/main/RPME%20Logo.png" 
              alt="RPME Logo" 
              className="h-10 w-auto"
              onError={(e) => { e.currentTarget.src = "https://placehold.co/200x80/064e3b/ffffff?text=RPME"; }}
            />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">About</a>
            <a href="#services" className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">Services</a>
            <a href="#locations" className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">Locations</a>
            <button 
              onClick={() => navigate('/login')}
              className="bg-emerald-900 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-emerald-950 transition-all active:scale-95"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-40">
           <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-50 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[100px]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold uppercase tracking-wider">
                <Globe2 size={14} />
                Global Reach, Local Depth
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Empowering Business in the <span className="text-emerald-800">Middle East</span>
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                RPME Limited Middle East is a leading international professional services firm. We integrate auditing, legal, tax, and business consulting to support your growth in dynamic markets.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button 
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 bg-emerald-900 text-white px-6 py-3.5 rounded-xl font-bold shadow-xl shadow-emerald-200 hover:bg-emerald-950 hover:translate-y-[-2px] transition-all"
                >
                  Client Screening Portal
                  <ArrowRight size={18} />
                </button>
                <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all">
                  Our Services
                </button>
              </div>
            </div>
            <div className="relative group lg:scale-90 origin-right">
              <div 
                id="hero-image-container"
                className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[3/2] max-h-[380px] relative border-[6px] border-white/50 backdrop-blur-sm transition-transform duration-700 group-hover:scale-[1.02]"
              >
                <img 
                  src="https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&q=80&w=1200" 
                  alt="Doha West Bay Skyline"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 space-y-3 max-w-[200px] hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Users2 className="text-emerald-700" size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-900 leading-none">100+</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Regional Experts</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Building2 className="text-amber-700" size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-900 leading-none">5+</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Major Hubs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                Integrated <br /> Professional <br /> <span className="text-emerald-700">Solutions</span>
              </h2>
              <div className="w-20 h-2 bg-emerald-700 rounded-full" />
              <p className="text-slate-600 leading-relaxed">
                Our approach combines multiple disciplines into a single point of advice, ensuring that every legal, tax, and audit consideration is aligned with your business objectives.
              </p>
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-8">
              {services.map((service, idx) => (
                <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{service.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {service.description}
                  </p>
                  <button className="text-emerald-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                    Explore Service <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section id="locations" className="py-32 bg-emerald-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <Globe2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform scale-[3]" size={400} />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl font-black tracking-tight uppercase">Presence Across the Region</h2>
            <p className="text-emerald-200/70 max-w-2xl mx-auto">
              Strategic offices positioned in the core business hubs of the Middle East to provide immediate, on-the-ground support.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            {locations.map((loc, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl text-center hover:bg-white/10 transition-all cursor-default">
                <MapPin className="mx-auto mb-4 text-emerald-400" size={24} />
                <div className="text-lg font-bold">{loc.city}</div>
                <div className="text-xs text-emerald-300 font-bold uppercase tracking-widest mt-1">{loc.country}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 pb-20 border-b border-white/5">
            <div className="col-span-2 space-y-8">
              <img 
                src="https://raw.githubusercontent.com/AnasQandeel/RPME-Logo/main/RPME%20Logo.png" 
                alt="RPME Logo" 
                className="h-12 w-auto invert brightness-0 grayscale opacity-80"
              />
              <p className="text-slate-400 max-w-sm leading-relaxed">
                A member profile of RPME Limited, the leading international firm for integrated professional services. Supporting German business globally since 1977.
              </p>
              <div className="flex gap-4">
                <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><Mail size={20} /></button>
                <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><Globe2 size={20} /></button>
                <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><ExternalLink size={20} /></button>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Contact</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li>Doha, Qatar</li>
                <li>Dubai, UAE</li>
                <li>Kuwait City, Kuwait</li>
                <li>Muscat, Oman</li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Compliance</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li 
                  onClick={() => navigate('/login')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  SanctionGuard Portal
                </li>
                <li className="hover:text-white cursor-pointer transition-colors uppercase text-[10px] font-black">Legal Notice</li>
                <li className="hover:text-white cursor-pointer transition-colors uppercase text-[10px] font-black">Privacy Policy</li>
              </ul>
            </div>
          </div>
          <div className="pt-12 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">
              © {new Date().getFullYear()} RPME Limited Middle East. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
