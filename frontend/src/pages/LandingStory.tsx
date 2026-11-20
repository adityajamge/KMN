import { useState } from "react";
import { ARRIVE, SESSION_TIME, STARTS_AT } from "../lib/constants";
import type { Plan } from "../lib/types";

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

const OUT_CORE: [string, string][] = [
  ["Settle into the alpha state", "Guided breath and sound frequencies help your brain move toward alpha, the calm-but-alert state linked with deep focus and rest. Many people feel the shift in the first mornings; results vary."],
  ["Steady attention and focus", "Train your mind to hold on one point, and to come back each time it drifts. A skill you carry straight into study, work and conversations."],
  ["See your thoughts and emotions clearly", "Watch thoughts and feelings as they rise, without getting pulled along by them. Seeing them clearly is where real change begins."],
  ["Bring your emotions into balance", "Find the small pause between what happens and how you react, so anger, worry and restlessness have less grip on your day."],
  ["Your own answer", "By Day 4 you’ll know from your own experience, not from anyone’s promise, whether to go further."],
];

const OUT_FULL: [string, string][] = [
  ["Know who you are, and what state you’re in", "Learn to recognise your own state from moment to moment: tired, anxious, scattered or clear. Knowing where you are is the first step to changing it."],
  ["Go deeper: alpha and theta", "30 guided mornings of breath and sound train your brain to settle toward alpha, and in deeper practice toward theta, the states linked with calm focus and deep rest. Results vary."],
  ["Balance in all six dimensions of you", "Body, breath, senses, mind, emotion and consciousness, trained one layer at a time, so every part of your life gets steadier, not just one."],
  ["Awareness, focus and attention that hold", "Stay with a chapter, a task or a conversation for longer, and take things in fully, which makes them easier to recall in class, at work or in an exam."],
  ["Train the automatic mind", "Daily repetition works on the part of you that runs below conscious thought, so calm and clarity begin to show up on their own, not only when you try."],
  ["Break old habit patterns", "Catch the loops that keep repeating, the same anger, worry or procrastination, and choose a different response, again and again, until it becomes yours."],
  ["Emotional independence", "Feel steady from the inside, without needing anyone else’s approval, opinion or answers to know you’re okay."],
  ["Your personal blueprint for life", "Bring it all together into your own way of life: what you value, how you want to live, and a daily practice for the 90 days after, and beyond. Yours, not borrowed."],
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
              {stage.items.map((item) => <li key={item}>{item}</li>)}
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
      <section className="section-ink">
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
              <Rings active={layer} onPick={setLayer} />
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
            <p className="muted-pills"><span>Something happens</span><span>You react at once</span></p>
            <p className="live-pills"><span>Something happens</span><span>You notice</span><span>A small pause · you choose</span><span>You respond</span></p>
            <p>No beliefs, rituals or prior experience needed.</p>
          </div>
        </div>
      </section>

      <section className="section-fresh">
        <div className="wrap stack">
          <div className="story-head">
            <div>
              <p className="eyebrow" style={{ color: "var(--primary)" }}>What you'll experience</p>
              <h2 className="display">{isCore ? "What you take home after four mornings" : "What 120 days can build in you"}</h2>
              <p>{isCore ? "Four mornings won’t change your whole life. They will show you, clearly and in your own body, what a trained mind feels like." : "With daily practice, these are the changes practitioners commonly describe. Your pace is your own."}</p>
            </div>
            <div className="mini-tabs" role="tablist" aria-label="Choose a plan">
              <button type="button" className={isCore ? "on" : ""} onClick={() => setPlan("core")}>Core · 4 days</button>
              <button type="button" className={!isCore ? "on" : ""} onClick={() => setPlan("comprehensive")}>Comprehensive · 120 days</button>
            </div>
          </div>
          <div className="outcome-grid">
            {outcomes.map(([title, text], index) => (
              <article key={title} className={index === outcomes.length - 1 ? "last" : ""}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
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
              <li><strong>Arrive and settle</strong> · {ARRIVE.replace(" AM", "")}, register and leave the rush at the door; we begin at {STARTS_AT} sharp</li>
              <li><strong>Understand</strong> · the scientific and spiritual reasoning behind the mind, the brain and their link with the body</li>
              <li><strong>Practise</strong> · the same morning, live it through Shadanga Kriya: core meditative practice with sound frequencies</li>
              <li><strong>Settle into clarity</strong> · come back slowly, with clarity and a realisation about your own life</li>
              <li className="last"><strong>Integrate</strong> · carry the patterns and learning into your own day, in time for school or work</li>
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
                <p>No pressure, and no follow-up calls you didn't ask for. If you want to continue, move to the Comprehensive program <strong>and your ₹499 comes off the ₹12,499 fee</strong>. If not, you keep the breathing and relaxation routine you learned, and you can keep practising on your own.</p>
              </>
            ) : (
              <>
                <h2 className="display">30 days build the practice. 90 days make it yours.</h2>
                <ul>
                  <li>30 guided mornings at the centre, then 90 days of guided self-practice with the Shadanga Kriya app</li>
                  <li>Weekend sessions at the centre for doubt-clearing and community gathering</li>
                  <li>A weekly progress check by the team</li>
                </ul>
                <p><strong>Why 120 days:</strong> a new habit takes about 66 days on average to feel automatic (Lally et al., 2009), so 30 days alone isn't enough.</p>
              </>
            )}
          </div>
          <div className="day-ring" aria-label="120 days: 30 guided mornings, then 90 days of practice">
            <strong>120</strong>
            <span>DAYS</span>
            <small>4 · Core · 30 · guided · 90 · practice</small>
          </div>
        </div>
      </section>

      <section className="section-relax not-wrap">
        <div className="wrap not-for">
          <p className="eyebrow">It's not for you if you</p>
          <ul>
            {NOT_FOR.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="section-ink">
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
        <g key={radius} onClick={() => onPick(index)} style={{ cursor: "pointer" }}>
          <circle cx="150" cy="150" r={radius} fill="none" stroke="transparent" strokeWidth="18" />
          <circle cx="150" cy="150" r={radius} fill="none" stroke={index === active ? "var(--lilac)" : "rgba(199,167,255,.4)"} strokeWidth={index === active ? 5 : 2.5} />
        </g>
      ))}
      <circle cx="150" cy="150" r="7" fill="#fff" />
    </svg>
  );
}
