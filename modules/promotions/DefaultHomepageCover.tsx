import { ArrowUpRight, Truck } from 'lucide-react';
import { defaultSettings, heroImage } from '@/config/defaults';
import type { SiteSettings } from '@/models/SiteSettings';

export default function DefaultHomepageCover({ settings }: { settings: SiteSettings }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Rooted in Nepal. At home in America.</p>
        <h1>{settings.hero_title === defaultSettings.hero_title ? (
          <>A little bit of Nepal,<br />wherever <em>you are</em></>
        ) : settings.hero_title}</h1>
        <p className="hero-description">{settings.hero_subtitle}</p>
        <a className="primary-button" href="/#shop">Fill your basket <ArrowUpRight size={19} /></a>
        <p className="hero-foot"><Truck size={17} />{settings.shipping_message}</p>
      </div>
      <div className="hero-image">
        <img src={heroImage} alt="A colorful spread of spices, ginger and chilies" />
        <div className="hero-stamp">From our pantry<br /><em>to yours.</em></div>
      </div>
    </section>
  );
}
