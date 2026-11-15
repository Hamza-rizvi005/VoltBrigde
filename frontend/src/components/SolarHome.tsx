import { useState } from "react";
import { Sun, Moon } from "lucide-react";

/** An illustrative energy story, deliberately separate from household telemetry. */
export function SolarHome() {
  const [night, setNight] = useState(false);
  return <div className={`solar-home ${night ? "is-night" : ""}`}>
    <div className="home-toolbar"><span><i /> YOUR HOME, IN BALANCE</span><span>Illustration</span></div>
    <div className="home-scene">
      <div className="home-orbit" aria-hidden="true" />
      <div className="home-weather" aria-hidden="true">{night ? <Moon /> : <Sun />}</div>
      <svg viewBox="0 0 600 410" role="img" aria-label={night ? "A solar home using stored battery energy at night" : "Rooftop solar supplying a home and charging its battery"}>
        <defs>
          <linearGradient id="roof" x2="1" y2="1"><stop stopColor="#355751"/><stop offset="1" stopColor="#172c2b"/></linearGradient>
          <linearGradient id="wall" x2="0" y2="1"><stop stopColor="#e0e6d5"/><stop offset="1" stopColor="#7a958c"/></linearGradient>
          <linearGradient id="panel" x2="1" y2="1"><stop stopColor="#1d5964"/><stop offset="1" stopColor="#132e3b"/></linearGradient>
        </defs>
        <g className="home-model">
          <path d="M65 298 302 180 554 300 310 423Z" fill="#0b1917" stroke="#315044"/>
          <path d="M65 298 310 414 554 300 554 313 310 431 65 311Z" fill="#142c25"/>
          <path d="M166 225 300 160 443 226 443 319 306 384 166 315Z" fill="url(#wall)"/>
          <path d="M306 289 443 226 443 319 306 384Z" fill="#617e72"/>
          <path d="M145 227 278 110 459 193 314 304Z" fill="url(#roof)" stroke="#78968a" strokeWidth="2"/>
          <path d="M278 110 459 193 459 210 278 127Z" fill="#213f36"/>
          <g transform="matrix(.96,.44,-.72,.57,270,136)" stroke="#6b9d9c" strokeWidth="1.5">
            {[0,1].map(r => [0,1,2].map(c => <g key={`${r}-${c}`} transform={`translate(${c*47},${r*55})`}><rect width="42" height="49" rx="2" fill="url(#panel)"/><path d="M14 0V49M28 0V49M0 16H42M0 33H42" opacity=".5"/></g>))}
          </g>
          <path d="M193 267 239 289 239 330 193 309Z" className="home-window"/>
          <path d="M215 278V320M193 288 239 310" stroke="#3c574c" strokeWidth="3"/>
          <path d="M264 301 291 314 291 375 264 362Z" fill="#273d35"/>
          <path d="M335 295 373 277 373 312 335 330Z" className="home-window"/>
          <path d="M394 266 422 253 422 287 394 300Z" className="home-window"/>
          <g transform="translate(104 269)"><path d="M0 0 34-15 57-4 24 12Z" fill="#d9e4d7"/><path d="M0 0 24 12 24 76 0 64Z" fill="#8daca0"/><path d="M24 12 57-4 57 61 24 76Z" fill="#344e42"/><path d="M32 25 48 17M32 36 48 28M32 47 48 39M32 58 48 50" stroke="#bfe88c" strokeWidth="5"/></g>
          <path className="home-energy" d={night ? "M135 337 165 352 194 338" : "M327 230 361 245 453 289 453 344 314 409 135 337"} fill="none" stroke="#c4ef93" strokeWidth="3"/>
          <g fill="#48684a"><ellipse cx="469" cy="302" rx="18" ry="10"/><path d="M468 301V250" stroke="#698864" strokeWidth="5"/><ellipse cx="467" cy="247" rx="22" ry="32"/><ellipse cx="494" cy="324" rx="13" ry="22"/></g>
        </g>
      </svg>
      <div className="scene-label"><span>{night ? "STORED ENERGY" : "ROOFTOP SOLAR"}</span><strong>{night ? "Keep essentials on" : "Put sunlight to work"}</strong><small>{night ? "Battery → lights, fans & fridge" : "Solar → home & battery"}</small></div>
    </div>
    <div className="home-controls" role="group" aria-label="Explore home energy scenarios">
      <button aria-pressed={!night} onClick={() => setNight(false)}><Sun size={15}/> Daytime solar</button>
      <button aria-pressed={night} onClick={() => setNight(true)}><Moon size={15}/> Evening backup</button>
    </div>
    <div className="home-tip" aria-live="polite"><div><strong>{night ? "Make room for the essentials." : "Laundry can wait for the sun."}</strong><p>{night ? "Plan lighter use when your home relies on the battery." : "Move flexible appliances into your solar hours."}</p></div></div>
  </div>;
}
