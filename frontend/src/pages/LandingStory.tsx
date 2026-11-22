import { useState } from "react";
import { ARRIVE, CORE_FEE, FULL_FEE, SESSION_TIME, STARTS_AT } from "../lib/constants";
import { inr } from "../lib/format";
import type { Plan } from "../lib/types";
import { Mark, Waterline } from "./marks";

const LIFE = [
  {
    label: "Student",
    img: "/media/landing/student.webp",
    alt: "A student at her study desk, lost in thought",
    items: [
      "You read the chapter twice. By evening, it’s gone.",
      "Your phone wins the fight for your attention, most days.",
      "Everyone has an opinion about your stream or career. You don’t have your own yet.",
      "In the exam hall you know you studied it, but it won’t come back.",
    ],
  },
  {
    label: "Working life",
    img: "/media/landing/work.webp",
    alt: "A man working late at home, tired, checking his phone",
    items: [
      "Your day is meetings and messages. Deep focus never arrives.",
      "You carry work stress home, then can’t switch off.",
      "Big decisions feel heavy, and you keep second-guessing them.",
      "You keep putting off the career change you think about.",
    ],
  },
  {
    label: "Love & marriage",
    img: "/media/landing/couple.webp",
    alt: "A couple sitting apart on a sofa after a disagreement",
    items: [
      "You react in an argument, then regret what you said.",
      "Expectations from both families pull you in two directions.",
      "You’re not sure if a big decision is yours or everyone else’s.",
      "Small misunderstandings turn into long silences.",
    ],
  },
  {
    label: "Parenthood",
    img: "/media/landing/parent.webp",
    alt: "A father at the breakfast table with his child, overwhelmed",
    items: [
      "Your patience runs out faster than you’d like.",
      "You react to your child’s small mistakes, then feel guilty.",
      "Decisions about your child feel driven by worry or comparison.",
      "Your own time and calm have quietly disappeared.",
    ],
  },
  {
    label: "Later life",
    img: "/media/landing/later.webp",
    alt: "An older woman sitting quietly by a window with tea",
    items: [
      "The mind keeps replaying the past or worrying about tomorrow.",
      "Your role is changing, and you’re asking ‘what now?’",
      "Sleep is lighter and the mind feels restless.",
      "You want calm and purpose, not more advice.",
    ],
  },
];

const LAYERS = [
  ["01", "Body", "शरीर", "Notice sensations, tension and relaxation.", "Sensations, posture, tension and relaxation, the body’s inner signals.", "Whatever happens in the world shows on the body first. It is the first field of awareness.", "the outermost layer"],
  ["02", "Breath", "श्वास", "Feel the breath before you control it.", "Breathing awareness, rhythm and breath synchronisation.", "The most practical bridge between body and mind. No difficult pranayama for beginners.", "one layer in"],
  ["03", "Senses", "इंद्रियाँ", "Seeing is not just seeing; hearing is not just hearing.", "Sight, sound and touch made finer, and sensory memory.", "Clear senses mean information is taken in properly, so it can be recalled later.", "two layers in"],
  ["04", "Mind & attention", "मन", "Not stopping thoughts, but noticing yourself between them.", "Concentration, attention, observation and visualisation.", "Attention is a capacity, not a talent. It can be steadied with practice.", "the middle layers"],
  ["05", "Emotion", "भाव", "Recognise a trigger before it runs you. Observe, don’t suppress.", "Recognising emotions and triggers, and telling reaction from response.", "Behaviour is driven by emotions and old patterns, not by thoughts alone.", "close to the centre"],
  ["06", "Consciousness", "चेतना", "Who is watching all this?", "Recognising the awareness that observes everything else.", "Here training becomes self-awareness: the single point of light at the centre.", "the centre"],
] as const;

const OUT_CORE: [string, string, string][] = [
  ["Settle into the alpha state", "Guided breath and sound frequencies help your brain move toward alpha, the calm-but-alert state linked with deep focus and rest. Many people feel the shift in the first mornings; results vary.", "M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"],
  ["Steady attention and focus", "Train your mind to hold on one point, and to come back each time it drifts. A skill you carry straight into study, work and conversations.", "M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18"],
  ["See your thoughts and emotions clearly", "Watch thoughts and feelings as they rise, without getting pulled along by them. Seeing them clearly is where real change begins.", "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6"],
  ["Bring your emotions into balance", "Find the small pause between what happens and how you react, so anger, worry and restlessness have less grip on your day.", "M12 4v16M7 20h10M4 8h16M6.5 8L4 14h5zM17.5 8L15 14h5z"],
  ["Your own answer", "By Day 4 you’ll know from your own experience, not from anyone’s promise, whether to go further.", "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M15.5 8.5l-2 5-5 2 2-5z"],
];

const OUT_FULL: [string, string, string][] = [
  ["Know who you are, and what state you’re in", "Learn to recognise your own state from moment to moment: tired, anxious, scattered or clear. Knowing where you are is the first step to changing it.", "M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M4 21c1-4 4-6 8-6s7 2 8 6"],
  ["Go deeper: alpha and theta", "30 guided mornings of breath and sound train your brain to settle toward alpha, and in deeper practice toward theta, the states linked with calm focus and deep rest. Results vary.", "M2 12c1.5-5 3-5 4.5 0s3 5 4.5 0 3-5 4.5 0 3 5 4.5 0 1.5-3 2-3"],
  ["Balance in all six dimensions of you", "Body, breath, senses, mind, emotion and consciousness, trained one layer at a time, so every part of your life gets steadier, not just one.", "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4"],
  ["Awareness, focus and attention that hold", "Stay with a chapter, a task or a conversation for longer, and take things in fully, which makes them easier to recall in class, at work or in an exam.", "M12 11v2M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18"],
  ["Train the subconscious mind", "Daily repetition works on the part of you that runs below conscious thought, so calm and clarity begin to show up on their own, not only when you try.", "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"],
  ["Break old habit patterns", "Catch the loops that keep repeating, the same anger, worry or procrastination, and choose a different response, again and again, until it becomes yours.", "M4 12h6M14 12h6M10 8l4 8M7 5l-3 7 3 7M17 5l3 7-3 7"],
  ["Emotional independence", "Feel steady from the inside, without needing anyone else’s approval, opinion or answers to know you’re okay.", "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  ["Your personal blueprint for life", "Bring it all together into your own way of life: what you value, how you want to live, and a daily practice you keep. Yours, not borrowed.", "M4 4h16v16H4zM4 9h16M9 9v11M12 13h5M12 16h3"],
];

const NOT_FOR = [
  "Want a guru or a set of beliefs to follow",
  "Expect instant results without daily practice",
  "Want it to replace medical or psychological treatment. It supports care; it never replaces it.",
  "Are below Class 8 (a children’s format is being developed)",
];

export function LifeStages() {
  const [life, setLife] = useState(0);
  const stage = LIFE[life];
  return (
    <section className="section-night">
      <div className="wrap stack">
        <div className="story-head">
          <div>
            <p className="eyebrow">Be honest with yourself</p>
            <h2 className="display">Does any of this sound familiar?</h2>
          </div>
          <p>Pick the stage of life you're in.</p>
        </div>
        <div className="life-chips" role="tablist" aria-label="Stage of life">
          {LIFE.map((item, index) => (
            <button key={item.label} type="button" role="tab" aria-selected={index === life} className={index === life ? "on" : ""} onClick={() => setLife(index)}>{item.label}</button>
          ))}
        </div>
        <div className="life-panel" role="tabpanel">
          <img src={stage.img} alt={stage.alt} />
          <div>
            <span className="eyebrow">Stage {life + 1} of {LIFE.length}</span>
            <h3 className="display">{stage.label}</h3>
            <ul>
              {stage.items.map((item) => <li key={item}><span className="dot" aria-hidden="true" /><span>{item}</span></li>)}
            </ul>
          </div>
        </div>
        <div className="story-band">
          <p>At every stage of life we call it a memory problem, a stress problem or a relationship problem. Often it's <strong>attention and awareness</strong>. What never got your full attention can't be seen clearly, or changed.</p>
          <p className="display">Attention isn't a talent. It's a capacity, and it can be trained.</p>
        </div>
      </div>
    </section>
  );
}

export function LandingStory({ plan, setPlan }: { plan: Plan; setPlan: (plan: Plan) => void }) {
  const [layer, setLayer] = useState(0);
  const dim = LAYERS[layer];
  const isCore = plan === "core";
  const outcomes = isCore ? OUT_CORE : OUT_FULL;

  return (
    <>
      <section className="section-ink dims">
        <div className="wrap stack story-gap">
          <div className="split-copy">
            <div>
              <p className="eyebrow">What is Shadanga Kriya?</p>
              <h2 className="display">Not just any other meditation, a structured training for your mind.</h2>
            </div>
            <p>A guidance to connect you with your inner self, while your brain acquires clarity with every breath. It's inspired by Shadanga Yoga from the ancient scriptures of yogic India, which counts <strong>tarka, Logic</strong> as a core. Further empowered with modern science.</p>
          </div>
          <div className="split-copy layers">
            <div>
              <p className="eyebrow">Six dimensions · outer to inner</p>
              <h3 className="display">Tap a layer to go inward</h3>
              <p className="hint light">Each layer lighter than the last, like the lotus. Tap a ring or a name.</p>
              <div className="ring-wrap">
                <Rings active={layer} onPick={setLayer} />
                <div className="ring-glow sk-breathe" aria-hidden="true" />
              </div>
            </div>
            <div className="layer-side">
              <div className="dim-chips">
                {LAYERS.map((item, index) => (
                  <button key={item[1]} type="button" className={index === layer ? "on" : ""} aria-pressed={index === layer} onClick={() => setLayer(index)}>
                    <span>{item[0]}</span>
                    {item[1] === "Mind & attention" ? "Mind" : item[1]}
                  </button>
                ))}
              </div>
              <article className="layer-card">
                <div className="split"><strong>{dim[1]}</strong><span lang="hi">{dim[2]}</span></div>
                <p>{dim[3]}</p>
                <div><small>What you train</small><p>{dim[4]}</p></div>
                <div><small>Why it matters</small><p>{dim[5]}</p></div>
                <div className="split">
                  <span>{dim[0]} of 06 · {dim[6]}</span>
                  <span className="pager">
                    <button type="button" aria-label="Previous layer" onClick={() => setLayer((layer + 5) % 6)}>‹</button>
                    <button type="button" aria-label="Next layer" onClick={() => setLayer((layer + 1) % 6)}>›</button>
                  </span>
                </div>
              </article>
            </div>
          </div>
          <div className="shift-flow">
            <h3 className="display">The one shift it trains</h3>
            <div className="shift-row muted">
              <span>Something happens</span>
              <svg width="56" height="12" viewBox="0 0 56 12" aria-hidden="true"><path d="M2 6h50M46 1l6 5-6 5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>You react at once</span>
            </div>
            <div className="shift-row live">
              <span className="s2">Something happens</span>
              <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true"><path d="M2 6h28" stroke="var(--wordmark)" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span className="s3">You notice</span>
              <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true"><path d="M2 6h28" stroke="var(--wordmark)" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span className="pause">A small pause · you choose</span>
              <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true"><path d="M2 6h28" stroke="var(--lilac)" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span className="respond">You respond</span>
            </div>
            <p>No beliefs, rituals or prior experience needed.</p>
          </div>
        </div>
        <Waterline to="fresh" />
      </section>

      <section className="section-fresh experience">
        <div className="wrap stack">
          <div className="story-head">
            <div>
              <p className="eyebrow" style={{ color: "var(--primary)" }}>What you'll experience</p>
              <h2 className="display">{isCore ? "What you take home after four mornings" : "What 30 days can build in you"}</h2>
              <p>{isCore ? "Four mornings won’t change your whole life. They will show you, clearly and in your own body, what a trained mind feels like." : "With daily practice, these are the changes practitioners commonly describe. Your pace is your own."}</p>
            </div>
            <div className="mini-tabs" role="tablist" aria-label="Choose a plan">
              <button type="button" className={isCore ? "on" : ""} onClick={() => setPlan("core")}>Core · 4 days</button>
              <button type="button" className={!isCore ? "on" : ""} onClick={() => setPlan("comprehensive")}>Comprehensive · 30 days</button>
            </div>
          </div>
          <div className="outcome-grid">
            {outcomes.map(([title, text, icon], index) => {
              const last = index === outcomes.length - 1;
              return (
                <article key={title} className={last ? "last" : ""}>
                  <span className="outcome-badge"><Mark size={24} stroke={last ? "var(--lilac)" : "var(--primary)"}><path d={icon} /></Mark></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="hint">{isCore ? "Day 1 can feel unfamiliar, and that’s normal. Just follow the voice." : "This is practice, not a promise. It grows with every morning you show up."}</p>
        </div>
      </section>

      <section className="section-fresh morning-wrap">
        <div className="wrap morning">
          <img src="/media/landing/morning.webp" alt="Participants seated in the Shadanga Kriya hall, eyes closed, in soft violet light" />
          <div className="morning-copy">
            <div>
              <p className="eyebrow">{SESSION_TIME}</p>
              <h2 className="display">What a morning looks like</h2>
            </div>
            <ol>
              <li><Mark stroke="var(--lilac)"><path d="M3 17h18M6 17a6 6 0 0 1 12 0M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6L17 10" /></Mark><span><strong>Arrive and settle</strong> · {ARRIVE.replace(" AM", "")}, register and leave the rush at the door; we begin at {STARTS_AT} sharp</span></li>
              <li><Mark stroke="var(--lilac)"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20M9 8h7M9 11.5h5" /></Mark><span><strong>Understand</strong> · the scientific and spiritual reasoning behind the mind, the brain and their link with the body</span></li>
              <li><Mark stroke="var(--lilac)"><path d="M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18" /></Mark><span><strong>Practise</strong> · the same morning, live it through Shadanga Kriya: core meditative practice with sound frequencies</span></li>
              <li><Mark stroke="var(--lilac)"><path d="M12 3c3 3.5 3 8.5 0 12-3-3.5-3-8.5 0-12zM4 13c3.5 0 6.5 2 8 6-4 0-7-2-8-6zM20 13c-3.5 0-6.5 2-8 6 4 0 7-2 8-6z" /></Mark><span><strong>Settle into clarity</strong> · come back slowly, with clarity and a realisation about your own life</span></li>
              <li className="last"><Mark stroke="var(--primary)"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Mark><span><strong>Integrate</strong> · carry the patterns and learning into your own day, in time for school or work</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section-relax">
        <div className="wrap after">
          <div>
            <p className="eyebrow" style={{ color: "var(--primary)" }}>After the program</p>
            {isCore ? (
              <>
                <h2 className="display">After Day 4, you decide.</h2>
                <p>No pressure, and no follow-up calls you didn't ask for. If you want to continue, move to the Comprehensive program <span className="accent">and your ₹{inr(CORE_FEE)} comes off the ₹{inr(FULL_FEE)} fee</span>. If not, you keep the breathing and relaxation routine you learned, and you can keep practising on your own.</p>
              </>
            ) : (
              <>
                <h2 className="display">Thirty mornings. One practice.</h2>
                <ul>
                  <li><Mark size={22} width={1.6} stroke="var(--primary)"><path d="M3 18v-6a9 9 0 0 1 18 0v6M3 18a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2zM21 18a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" /></Mark><span>30 guided mornings at the centre, 24 Nov to 23 Dec, with the Shadanga Kriya app</span></li>
                  <li><Mark size={22} width={1.6} stroke="var(--primary)"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /></Mark><span>Weekend sessions at the centre for doubt-clearing and community gathering</span></li>
                  <li><Mark size={22} width={1.6} stroke="var(--primary)"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.2c2.9.1 6 1.6 6 5.8" /></Mark><span>A weekly progress check by the team</span></li>
                </ul>
                <p>Core is the first four mornings, 24–27 Nov. Comprehensive is the full 30 mornings, through 23 Dec.</p>
              </>
            )}
          </div>
          <div className="day-ring">
            <svg viewBox="-8 -10 368 348" role="img" aria-label="30 days: 4 Core mornings, then 26 more guided mornings">
              <circle cx="160" cy="160" r="130" fill="none" stroke="var(--lilac)" strokeWidth="22" />
              <circle cx="160" cy="160" r="130" fill="none" stroke="var(--primary)" strokeWidth="22" />
              <circle cx="160" cy="160" r="130" fill="none" stroke="var(--night)" strokeWidth="22" strokeDasharray="108.9 707.9" transform="rotate(-90 160 160)" />
              <circle cx="160" cy="160" r="70" fill="#FFFFFF" />
              <circle cx="160" cy="160" r="9" fill="none" stroke="var(--wordmark)" strokeWidth="2" />
              <text x="160" y="140" textAnchor="middle" fontFamily="Satisfy SK, Georgia, serif" fontSize="36" fill="var(--ink)">30</text>
              <text x="160" y="190" textAnchor="middle" fontFamily="Objective, sans-serif" fontSize="11" fontWeight="500" letterSpacing="2" fill="var(--primary)">DAYS</text>
              <text x="40" y="22" fontFamily="Objective, sans-serif" fontSize="11" fontWeight="500" fill="var(--ink)">● 4 · Core</text>
              <text x="210" y="22" fontFamily="Objective, sans-serif" fontSize="11" fontWeight="500" fill="var(--primary)">● 30 · mornings</text>
            </svg>
          </div>
        </div>
      </section>

      <section className="section-relax not-wrap">
        <div className="wrap not-for">
          <p className="eyebrow">It's not for you if you</p>
          <ul>
            {NOT_FOR.map((item) => <li key={item}><Mark size={18} width={2} stroke="rgba(10,10,10,0.5)"><path d="M7 7l10 10M17 7L7 17" /></Mark><span>{item}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="section-ink guide">
        <div className="wrap founder">
          <img src="/media/landing/yogee.webp" alt="Yogee, founder of Shadanga Kriya, seated and smiling" />
          <div>
            <p className="eyebrow">Your guide, not your guru</p>
            <h2 className="display">It began with one word: "Why?"</h2>
            <p>Yogee grew up in a traditional Vedic family and wouldn't follow any practice he couldn't understand. That question took him back into the Vedas, the Upanishads and Patanjali, then into neuroscience, then across India to learn from yogis and scientists.</p>
            <p>After 20 years of practice he built Shadanga Kriya, so that no one has to depend on anyone to find their way, <strong>including him</strong>.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function Rings({ active, onPick }: { active: number; onPick: (index: number) => void }) {
  const radii = [140, 116, 92, 68, 44, 22];
  return (
    <svg className="rings" viewBox="0 0 300 300" role="img" aria-label="Six rings, from Body on the outside to Consciousness at the centre">
      {radii.map((radius, index) => (
        <g key={radius}>
          <circle
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke={index === active ? "var(--lilac)" : `color-mix(in srgb, var(--lilac) ${16 + index * 8}%, transparent)`}
            strokeWidth={index === active ? 6 - index * 0.6 : 4 - index * 0.5}
            style={index === active ? { filter: "drop-shadow(0 0 6px var(--wordmark))" } : undefined}
          />
          <circle cx="150" cy="150" r={radius} fill="none" stroke="transparent" strokeWidth="20" onClick={() => onPick(index)}>
            <title>{LAYERS[index][0]} {LAYERS[index][1]}</title>
          </circle>
        </g>
      ))}
      <defs>
        <radialGradient id="skAtmaD">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="var(--lilac)" stopOpacity="0.7" />
          <stop offset="0.7" stopColor="var(--wordmark)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--wordmark)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="sk-atma" cx="150" cy="150" r="30" fill="url(#skAtmaD)" />
      <circle className="sk-atma-dot" cx="150" cy="150" r="7" fill="#FFFFFF" />
    </svg>
  );
}
