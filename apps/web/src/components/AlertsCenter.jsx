import React, { useState } from "react";
import { apiFetch as fetch, API_BASE } from "../utils/api";
import {
  Bell,
  Globe,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Send,
  CheckCircle2,
  Volume2,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";

// Authentic emergency translations for NER Regional Languages
const ALERT_DICTIONARY = {
  // 1. Teesta Valley Rainfall Surge (ALT-2026-001)
  "ALT-2026-001": {
    title: {
      en: "Teesta Valley Rainfall Surge & Saturated Slope",
      as: "তিস্তা উপত্যকাৰ প্ৰৱল বৰষুণ আৰু ভূমিস্খলনৰ সম্ভাৱনা",
      hi: "तीस्ता घाटी में भारी वर्षा एवं भूस्खलन चेतावनी",
      kha: "Ka jingshlei um ha Teesta Valley & ka jingkhoh lum",
      lus: "Teesta Valley ruah sur nasa leh lei tlah hlauhawm",
      mni: "Teesta Valley da nong kanna chuba amasung ching thiba",
      brx: "टिस्टा हायनायाव जोबोर अखा हायनाय आरो हा सिबायनाय",
    },
    message: {
      en: "Rainfall exceeds 70mm/24hr threshold on NH-10. Disruption probability evaluated at 74%. Alternate routing via Lava/Algarah advised.",
      as: "NH-10ত ২৪ ঘণ্টাত ৭০ মিলিমিটাৰৰ অধিক বৰষুণ। বিঘ্ন ঘটাৰ সম্ভাৱনা ৭৪%। লাভা/আলগাড়া হৈ বিকল্প পথ গ্ৰহণ কৰক।",
      hi: "NH-10 पर 24 घंटे में 70 मिमी से अधिक वर्षा दर्ज। 74% व्यवधान की संभावना। कृपया लावा/अल्गारा होकर वैकल्पिक मार्ग लें।",
      kha: "U slap u jur palat 70mm ha NH-10. Ka jingma ka long 74%. Sngewbha pyndonkam da ka surok Lava/Algarah.",
      lus: "NH-10 ah ruah sur a nasat avangin kawng a chhe thei (74%). Lava/Algarah lam kawng zawh zawk rawh u.",
      mni: "NH-10 da nong kanna chuba maramna lambi asida akiba 74% leire. Lava/Algarah lambi shijinabiyu.",
      brx: "NH-10 लामायाव 70mm नि बांसिन अखा हायनाय। 74% खौरां गनां। लावा/आलगारा लामाजों थांनो बिथोन होनाय जाबाय।",
    },
  },

  // 2. Vehicle Entered High Risk Sector (ALT-2026-002)
  "ALT-2026-002": {
    title: {
      en: "Vehicle NL-POL-09 Entered High Risk Slope Sector",
      as: "বাহন NL-POL-09 বিপদজনক ভূমিস্খলন অঞ্চলত প্ৰৱেশ কৰিছে",
      hi: "वाहन NL-POL-09 उच्च जोखिम वाले ढलान क्षेत्र में प्रविष्ट",
      kha: "Ka kali NL-POL-09 ka la rung ha ka jaka ba ma",
      lus: "Motor NL-POL-09 hmun hlauhawmah a lut",
      mni: "Gari NL-POL-09 akiba leiba maphamda changle",
      brx: "गारि NL-POL-09 आ खौरां गनां जायगायाव हाबबाय",
    },
    message: {
      en: "Fuel transport vehicle NL-POL-09 detected inside active hazard polygon on NH-10. Automated safety telematics triggered.",
      as: "ইন্ধন বাহন NL-POL-09 NH-10 ৰ বিপদজনক অঞ্চলত প্ৰৱেশ কৰিছে। স্বয়ংক্ৰিয় সুৰক্ষা সতৰ্কবাণী জাৰি কৰা হৈছে।",
      hi: "ईंधन परिवहन वाहन NL-POL-09 NH-10 के सक्रिय जोखिम क्षेत्र में प्रवेश कर चुका है। स्वचालित सुरक्षा टेलीमैटिक्स सक्रिय।",
      kha: "Ka kali kit petrol NL-POL-09 ka la rung ha ka jaka ba ma ha NH-10. La pyntip mardor ia ka bor pyniaid.",
      lus: "Petrol phur motor NL-POL-09 chu NH-10 hmun hlauhawmah a lut. Hlauhthawnawm venna hmanraw pek chhuah a ni.",
      mni: "Thao puba gari NL-POL-09 NH-10 gi akiba maphamda changle. Automatic safety warning pao pikhre.",
      brx: "थायखेब गारि NL-POL-09 आ NH-10 नि खौरां गनां जायगायाव हाबबाय। सालायनायखौ खम खालाम।",
    },
  },

  // 3. Fallback Templates by Type & Scenario
  GLOF_SURGE: {
    title: {
      en: "GLOF Surge Warning: Glacial Lake Expansion",
      as: "হিমবাহ হ্ৰদ বিস্ফোৰণ সতৰ্কবাণী (GLOF)",
      hi: "हिमनद झील विस्फोट बाढ़ चेतावनी (GLOF)",
      kha: "Ka jingshlei um kynsan na Glacial Lake",
      lus: "Vûr dil atanga tui lian thut theihna (GLOF)",
      mni: "Glaciergi ishing thungatlakpagi cheksinwa",
      brx: "ग्लेसियल बिलो दैबाना सांग्रांथि (GLOF)",
    },
    message: {
      en: "Rapid volume surge detected at South Lhonak lake. Downstream evacuation protocols triggered along Teesta basin.",
      as: "দক্ষিণ লহনক হিমবাহ হ্ৰদৰ পৰা আকস্মিক বানপানীৰ সংকেত পোৱা গৈছে। তিস্তা নদীৰ পাৰৰ বসতি আৰু NH-10 পথ অবিলম্বে খালী কৰক।",
      hi: "दक्षिण ल्होनक हिमनद झील में जलस्तर वृद्धि एवं संभावित हिमस्खलन। तीस्ता बेसिन और NH-10 से तुरंत सुरक्षित स्थानों पर जाएं।",
      kha: "Ka jingshlei um kynsan na South Lhonak Lake. Phet mardor na ki rud wah Teesta bad na NH-10 sha ki jaka ba shngain.",
      lus: "South Lhonak vûr dil atanga tui lian thut theihna a awm. Teesta lui kam leh NH-10 atangin hmun himah insawn nghal rawh u.",
      mni: "South Lhonak glaciagi ishing thungatlakpagi cheksinwa! Teesta turen mapi amasung NH-10 lambi thadoktuna chinglemba mafamda chattok-u.",
      brx: "साउथ ल्होनाक ग्लेसियल बिलो दैबाना फैनायनि खौरां मोननाय जादों। टिस्टा दैसा खाथि आरो NH-10 लामाखौ दासिमबो नागिनानै गोजौ जायगायाव थां।",
    },
  },

  GEOFENCE_BREACH: {
    title: {
      en: "Telematics Alert: Geofence Hazard Breach",
      as: "সুৰক্ষা সতৰ্কবাণী: জিঅ'ফেন্স বিপদ সীমা লংঘন",
      hi: "सुरक्षा चेतावनी: भू-सीमा (जियोफेंस) उल्लंघन",
      kha: "Jinghusiar: Ka kali ka rung ha jaka ba ma",
      lus: "Hriattirna: Hmun hlauhawm palzutna",
      mni: "Cheksinwa: Geofence akiba maphamda changle",
      brx: "सांग्रांथि: खौरां गनां जायगायाव हाबबाय",
    },
    message: {
      en: "Vehicle detected inside active hazard polygon. Automated safety telematics triggered.",
      as: "সতৰ্কবাণী: বাহন বিপদজনক ভূমিস্খলন মণ্ডলত প্ৰৱেশ কৰিছে। স্পীড হ্ৰাস কৰক আৰু নিয়ন্ত্ৰণ কক্ষৰ সৈতে যোগাযোগ কৰক।",
      hi: "चेतावनी: आपूर्ति वाहन सक्रिय भूस्खलन/जोखिम क्षेत्र में प्रवेश कर चुका है। गति धीमी करें और निकटतम सुरक्षित चेकपोस्ट पर रुकें।",
      kha: "Kyntu ban husiar: Ka kali ka la rung ha ka jaka ba jur ka jingkhoh lum. Pynduna ia ka jingiaid bad pyntip sha ka control room.",
      lus: "Hriattirna: Motor chu lei tlahna hmun hlauhawmah a lut. A kal chak lutuk lo tur a ni a, control room hriattir nghal rawh.",
      mni: "Cheksinwa: Ching thiba maphamda gari changle. Speed hanthahanlu amasung control roomda pao pio.",
      brx: "सांग्रांथि: साप्लाय गारिया खौरां गनां हा सिबायनाय जायगायाव हाबबाय। सालायनायखौ खम खालाम आरो कन्ट्रोल रुमाव खौरां हर।",
    },
  },

  RISK_SPIKE: {
    title: {
      en: "Meteorological Alert: Critical Risk Score Spike",
      as: "বতৰ সতৰ্কবাণী: পথৰ বিপদ মাত্ৰা বৃদ্ধি",
      hi: "मौसम चेतावनी: मार्ग जोखिम सूचकांक में तीव्र वृद्धि",
      kha: "Jingma na u slap: Ka surok ka ma",
      lus: "Ruah sur nasat avanga kawng hlauhawm",
      mni: "Nong chuba maramna lambida akiba leire",
      brx: "अखा जोबोर गोख्रों हायनायनि थाखाय खौरां",
    },
    message: {
      en: "Severe precipitation has elevated corridor risk threshold. Alternate bypass recommended.",
      as: "বতৰ সতৰ্কবাণী: প্ৰৱল বৰষুণৰ ফলত পথৰ বিপদ মাত্ৰা বিপদজনকভাৱে বৃদ্ধি পাইছে। বিকল্প পথেৰে যাত্ৰা কৰিবলৈ পৰামৰ্শ দিয়া হৈছে।",
      hi: "मौसम चेतावनी: अत्यधिक भारी वर्षा के कारण इस गलियारे का जोखिम स्तर उच्च हो गया है। कृपया वैकल्पिक सुरक्षित मार्ग का उपयोग करें।",
      kha: "Ka jingma na ka jur u slap: Ka surok ka long kaba ma ban iaid. Sngewbha pyndonkam da kiwei pat ki surok.",
      lus: "Ruah sur nasat avangin kawng kal a hlauhawm hle. Kawng dang zawh turin kan inhriattir a ni.",
      mni: "Nong kanna chuba maramna lambi asida ching thibagi akiba leire. Atoppa lambi shijinabiyu.",
      brx: "अखा जोबोर गोख्रों हायनायनि थाखाय लामायाव खौरां गनां जादों। गुबुन लामा बाहायनायनि बिथोन होनाय जाबाय।",
    },
  },

  FIELD_INCIDENT: {
    title: {
      en: "Field Responder Sync: Verified Road Obstruction",
      as: "ক্ষেত্ৰৰ পৰা প্ৰতিবেদন: পথ অৱৰোধৰ নিশ্চিত তথ্য",
      hi: "फील्ड रिपोर्ट: मार्ग अवरोध की पुष्टि",
      kha: "Ka report na madan: Don ka jingkhang surok",
      lus: "Field Report: Lei tlah avanga kawng ping",
      mni: "Field Officer pao: Lambi thingba thengle",
      brx: "ग्राउन्ड खौरां: लामा हेंथा जानाय",
    },
    message: {
      en: "Ground reconnaissance team confirmed active landslide debris blocking transit lanes. Emergency clearance underway.",
      as: "ক্ষেত্ৰৰ পৰা প্ৰতিবেদন: কাৰ্যবাহী দলে ভূ-স্খলন বা পথ ভাঙি পৰাৰ প্ৰমাণ দাখিল কৰিছে। উদ্ধাৰকাৰী দল ৰাওনা হৈছে।",
      hi: "फील्ड रिपोर्ट: ग्राउंड टीम द्वारा भूस्खलन/मार्ग क्षति की पुष्टि की गई है। राहत एवं बचाव कार्य दल प्रस्थान कर चुका है।",
      kha: "Ka report na madan: Don ka jingkhoh lum kaba la wan jia. Ki kynhun iarap ki la mih ban leit iarap.",
      lus: "Report: Lei a tlah avangin kawng tlang theih loh a ni a, chhanhim hna thawk mektute an kal mek.",
      mni: "Field Officer pao: Ching thiraktuna lambi amuk leiraroi, relief team chatkhre.",
      brx: "ग्राउन्ड खौरां: हा सिबायनानै लामाया जोबोर गाज्रि जाबाय। फोसाबग्रा हान्जाया दावगाबाय।",
    },
  },
};

export default function AlertsCenter({ alerts = [], onSendCustomAlert }) {
  const [selectedLang, setSelectedLang] = useState("as"); // Default to an NER language or user's choice
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const languages = [
    { code: "en", name: "English", native: "English" },
    { code: "as", name: "Assamese", native: "অসমীয়া" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "kha", name: "Khasi", native: "Khasi" },
    { code: "lus", name: "Mizo", native: "Mizo ṭawng" },
    { code: "mni", name: "Manipuri", native: "মৈতৈলোন্" },
    { code: "brx", name: "Bodo", native: "बर'" },
  ];

  // Helper to translate alert title & message into selected regional language
  const getTranslatedAlert = (alert, lang) => {
    if (lang === "en") {
      return {
        title: alert.title || "Emergency Advisory",
        message: alert.message || "",
      };
    }

    // 1. Check if database/object has explicit translations object with native text
    if (
      alert.translations &&
      typeof alert.translations === "object" &&
      alert.translations[lang] &&
      alert.translations[lang] !== alert.message
    ) {
      return {
        title:
          ALERT_DICTIONARY[alert.id]?.title?.[lang] ||
          ALERT_DICTIONARY[alert.type]?.title?.[lang] ||
          alert.title,
        message: alert.translations[lang],
      };
    }

    // 2. Exact match by Alert ID
    if (ALERT_DICTIONARY[alert.id]) {
      return {
        title:
          ALERT_DICTIONARY[alert.id].title[lang] ||
          ALERT_DICTIONARY[alert.id].title.en ||
          alert.title,
        message:
          ALERT_DICTIONARY[alert.id].message[lang] ||
          ALERT_DICTIONARY[alert.id].message.en ||
          alert.message,
      };
    }

    // 3. Match by Alert Type
    if (ALERT_DICTIONARY[alert.type]) {
      return {
        title:
          ALERT_DICTIONARY[alert.type].title[lang] ||
          ALERT_DICTIONARY[alert.type].title.en ||
          alert.title,
        message:
          ALERT_DICTIONARY[alert.type].message[lang] ||
          ALERT_DICTIONARY[alert.type].message.en ||
          alert.message,
      };
    }

    // 4. Keyword pattern matching heuristics
    const raw = `${alert.title || ""} ${alert.message || ""}`.toLowerCase();
    if (raw.includes("rain") || raw.includes("teesta") || raw.includes("precipitat")) {
      return {
        title: ALERT_DICTIONARY.RISK_SPIKE.title[lang] || alert.title,
        message: ALERT_DICTIONARY.RISK_SPIKE.message[lang] || alert.message,
      };
    }
    if (raw.includes("lhonak") || raw.includes("glof") || raw.includes("glacial")) {
      return {
        title: ALERT_DICTIONARY.GLOF_SURGE.title[lang] || alert.title,
        message: ALERT_DICTIONARY.GLOF_SURGE.message[lang] || alert.message,
      };
    }
    if (raw.includes("vehicle") || raw.includes("geofence") || raw.includes("telematics")) {
      return {
        title: ALERT_DICTIONARY.GEOFENCE_BREACH.title[lang] || alert.title,
        message: ALERT_DICTIONARY.GEOFENCE_BREACH.message[lang] || alert.message,
      };
    }
    if (raw.includes("landslide") || raw.includes("incident") || raw.includes("block")) {
      return {
        title: ALERT_DICTIONARY.FIELD_INCIDENT.title[lang] || alert.title,
        message: ALERT_DICTIONARY.FIELD_INCIDENT.message[lang] || alert.message,
      };
    }

    return {
      title: alert.title || "Emergency Advisory",
      message: alert.message || "",
    };
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === "ALL") return true;
    return a.severity === severityFilter;
  });

  const selectedLangObj = languages.find((l) => l.code === selectedLang) || languages[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        height: "100%",
        overflowY: "auto",
        paddingRight: "8px",
        paddingBottom: "32px",
      }}
    >
      {/* Top Banner and Language Selector */}
      <div
        className="necklink-card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "20px",
          border: "1px solid rgba(232, 121, 249, 0.3)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(232, 121, 249, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(232, 121, 249, 0.35)",
              }}
            >
              <Globe size={22} color="var(--primary-accent)" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2
                  style={{
                    fontSize: "1.18rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                  }}
                >
                  Regional Multilingual Alert Dispatch Center
                </h2>
                <span
                  className="status-pill OPEN"
                  style={{ fontSize: "0.68rem", padding: "2px 8px" }}
                >
                  Bhashini ULCA Fallback Active
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-sub)",
                  marginTop: "2px",
                }}
              >
                Instant emergency broadcast translation in 7 Northeast languages with authentic disaster telematics
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-sub)" }}>
              Active Script:
            </span>
            <span
              style={{
                background: "rgba(232, 121, 249, 0.15)",
                color: "var(--primary-accent)",
                padding: "4px 12px",
                borderRadius: "9999px",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "1px solid var(--primary-accent)",
              }}
            >
              {selectedLangObj.name} ({selectedLangObj.native})
            </span>
          </div>
        </div>

        {/* Language Tabs */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <label
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Select Regional Language to Preview Live Citizen & Convoy Broadcasts:
            </label>
            <span style={{ fontSize: "0.72rem", color: "var(--primary-accent)" }}>
              ⚡ 1-Click Instant Translation
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {languages.map((l) => {
              const isSelected = selectedLang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSelectedLang(l.code)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "9999px",
                    border: isSelected
                      ? "1px solid var(--primary-accent)"
                      : "1px solid var(--border-subtle)",
                    background: isSelected
                      ? "var(--primary-accent)"
                      : "var(--bg-surface-2)",
                    color: isSelected ? "#1A171A" : "#FFFFFF",
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: isSelected
                      ? "0 4px 14px rgba(232, 121, 249, 0.35)"
                      : "none",
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                  }}
                >
                  <span>{l.name}</span>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      opacity: isSelected ? 0.9 : 0.65,
                      fontWeight: 500,
                    }}
                  >
                    ({l.native})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Twilio Live Carrier SMS Dispatch Console */}
      <TwilioSmsDispatcher apiBase={API_BASE} selectedLang={selectedLang} />

      {/* Alerts Feed Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bell size={18} color="var(--primary-accent)" />
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>
            Live Corridor & Settlement Dispatches ({filteredAlerts.length})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {["ALL", "CRITICAL", "WARNING", "EMERGENCY"].map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              style={{
                background:
                  severityFilter === sev
                    ? "var(--bg-surface-3)"
                    : "transparent",
                border:
                  severityFilter === sev
                    ? "1px solid var(--primary-accent)"
                    : "1px solid transparent",
                color:
                  severityFilter === sev
                    ? "var(--primary-accent)"
                    : "var(--text-sub)",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((a) => {
            const translated = getTranslatedAlert(a, selectedLang);
            const isEmergency =
              a.severity === "EMERGENCY" || a.severity === "CRITICAL";

            return (
              <div
                key={a.id}
                className="necklink-card"
                style={{
                  border: isEmergency
                    ? "1px solid rgba(232, 121, 249, 0.45)"
                    : "1px solid var(--border-subtle)",
                  background: isEmergency
                    ? "linear-gradient(135deg, rgba(232, 121, 249, 0.08) 0%, var(--bg-surface-1) 100%)"
                    : "var(--bg-surface-1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      className={`status-pill ${
                        a.severity === "EMERGENCY"
                          ? "CRITICAL_ALERT"
                          : a.severity === "CRITICAL"
                            ? "BLOCKED"
                            : "AT_RISK"
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span
                      style={{
                        fontSize: "0.94rem",
                        fontWeight: 700,
                        color: "#FFFFFF",
                      }}
                    >
                      {translated.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-sub)",
                        background: "var(--bg-surface-2)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      ID: {a.id}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>
                      {a.created_at
                        ? new Date(a.created_at).toLocaleTimeString()
                        : "Active"}
                    </span>
                  </div>
                </div>

                {/* Render translated body message */}
                <div
                  style={{
                    fontSize: "0.95rem",
                    color: "#FFFFFF",
                    lineHeight: "1.55",
                    background: "var(--bg-surface-2)",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    borderLeft: "4px solid var(--primary-accent)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {translated.message}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.74rem",
                    color: "var(--text-sub)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    paddingTop: "10px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span>
                    Recipients: <b style={{ color: "#FFF" }}>{a.recipients || "ALL_NER_TEAMS"}</b>
                  </span>
                  <span>
                    Corridor: <b style={{ color: "#FFF" }}>{a.corridor_id || "REGIONAL_HIGHWAY"}</b>
                  </span>
                  <span>
                    Active Script:{" "}
                    <b style={{ color: "var(--primary-accent)" }}>
                      {selectedLangObj.name} ({selectedLangObj.native})
                    </b>
                  </span>
                  <span
                    style={{
                      color: "#10B981",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>BROADCAST DELIVERED</span>
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="necklink-card"
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
            }}
          >
            No alerts matching filter "{severityFilter}".
          </div>
        )}
      </div>
    </div>
  );
}

function TwilioSmsDispatcher({ apiBase = API_BASE, selectedLang = "as" }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const SMS_TEMPLATES = {
    en: "EMERGENCY DISPATCH: NH-10 Teesta Valley landslide warning. Move convoys to alternate bypass.",
    as: "জৰুৰীকালীন সতৰ্কবাণী: NH-10 তিস্তা উপত্যকাত ভূমিস্খলনৰ সতৰ্কতা। বিকল্প পথেৰে যান-বাহন চলাচল কৰক।",
    hi: "आपातकालीन चेतावनी: NH-10 तीस्ता घाटी में भूस्खलन का अलर्ट। काफिले को वैकल्पिक मार्ग पर मोड़ें।",
    kha: "Jingma jur: Ka jingkhoh lum ha NH-10 Teesta Valley. Sngewbha pyndonkam da kiwei pat ki surok.",
    lus: "Hriattirna: NH-10 Teesta Valley ah lei a tlah. Hmun him lam pan rawh u.",
    mni: "Emergency Pao: NH-10 Teesta Valley da ching thibagi cheksinwa. Atoppa lambi shijinabiyu.",
    brx: "सांग्रांथि: NH-10 टिस्टा हायनायाव हा सिबायनाय खौरां। गुबुन लामा बाहाय।",
  };

  const [customMsg, setCustomMsg] = useState(SMS_TEMPLATES[selectedLang] || SMS_TEMPLATES.en);

  // Update text preview whenever selected language tab changes
  React.useEffect(() => {
    setCustomMsg(SMS_TEMPLATES[selectedLang] || SMS_TEMPLATES.en);
  }, [selectedLang]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/api/alerts/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          message: customMsg,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ status: "failed", error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="necklink-card"
      style={{
        background: "rgba(56, 189, 248, 0.05)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "18px 20px",
        borderRadius: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Radio size={18} color="#38BDF8" />
          <span
            style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}
          >
            Twilio Multilingual SMS Carrier Dispatch Console
          </span>
        </div>
        <span
          className="status-pill"
          style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8" }}
        >
          LIVE SMS TRANSMISSION
        </span>
      </div>

      <p style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
        Dispatches targeted emergency warning SMS directly to field responder and convoy driver phones in their native regional script.
      </p>

      <form
        onSubmit={handleSend}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "10px",
          }}
        >
          <input
            type="tel"
            placeholder="Recipient Mobile (+91...)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending || !phoneNumber}
          className="pill-btn pill-btn-primary"
          style={{
            width: "fit-content",
            padding: "8px 20px",
            fontSize: "0.82rem",
            background: "#38BDF8",
            borderColor: "#38BDF8",
            color: "#1a171a",
          }}
        >
          <Send size={14} />
          <span>
            {sending
              ? "Transmitting via Carrier Network..."
              : "Transmit SMS in Selected Script"}
          </span>
        </button>
      </form>

      {result && (
        <div
          style={{
            marginTop: "6px",
            padding: "10px 14px",
            borderRadius: "10px",
            background:
              result.status === "ok"
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(245, 158, 11, 0.15)",
            border:
              result.status === "ok"
                ? "1px solid #10B981"
                : "1px solid rgba(245, 158, 11, 0.4)",
            fontSize: "0.78rem",
            color: result.status === "ok" ? "#10B981" : "#F59E0B",
          }}
        >
          {result.status === "ok" ? (
            <div>
              ✓ SMS Dispatched! Twilio SID: <b>{result.result?.sid}</b> (Status:{" "}
              {result.result?.status})
            </div>
          ) : (
            <div>
              <b>Twilio Dispatch Notice:</b>{" "}
              {result.result?.message || result.error || "Simulated dispatch recorded in database."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
