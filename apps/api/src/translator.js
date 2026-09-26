/**
 * NECKLINK Multilingual Dispatch Translation Service
 * Connects to Bhashini ULCA API / Google Translate if credentials present,
 * with authentic emergency regional terminology for NER languages:
 * Assamese (as), Hindi (hi), Khasi (kha), Mizo (lus), Manipuri (mni), Bodo (brx).
 */

import { bhashiniReady, languageTask } from "./services/bhashiniService.js";
const REGIONAL_TEMPLATES = {
  GLOF_SURGE: {
    as: "দক্ষিণ লহনক হিমবাহ হ্ৰদৰ পৰা আকস্মিক বানপানীৰ সংকেত পোৱা গৈছে। তিস্তা নদীৰ পাৰৰ বসতি আৰু NH-10 পথ অবিলম্বে খালী কৰক।",
    hi: "दक्षिण ल्होनक हिमनद झील में जलस्तर वृद्धि एवं संभावित हिमस्खलन। तीस्ता बेसिन और NH-10 से तुरंत सुरक्षित स्थानों पर जाएं।",
    kha: "Ka jingshlei um kynsan na South Lhonak Glacial Lake. Phet mardor na ki rud wah Teesta bad na NH-10 sha ki jaka ba shngain.",
    lus: "South Lhonak vûr dil atanga tui lian thut theihna a awm. Teesta lui kam leh NH-10 atangin hmun himah insawn nghal rawh u.",
    mni: "South Lhonak glaciagi ishing thungatlakpagi cheksinwa! Teesta turen mapi amasung NH-10 lambi thadoktuna chinglemba mafamda chattok-u.",
    brx: "साउथ ल्होनाक ग्लेसियल बिलो दैबाना फैनायनि खौरां मोननाय जादों। टिस्टा दैसा खाथि आरो NH-10 लामाखौ दासिमबो नागिनानै गोजौ जायगायाव थां।",
  },
  GEOFENCE_BREACH: {
    as: "সতৰ্কবাণী: অপাৰেটিং বাহন বিপদজনক ভূমিস্খলন মণ্ডলত প্ৰৱেশ কৰিছে। স্পীড হ্ৰাস কৰক আৰু নিয়ন্ত্ৰণ কক্ষৰ সৈতে যোগাযোগ কৰক।",
    hi: "चेतावनी: आपूर्ति वाहन सक्रिय भूस्खलन/जोखिम क्षेत्र में प्रवेश कर चुका है। गति धीमी करें और निकटतम सुरक्षित चेकपोस्ट पर रुकें।",
    kha: "Kyntu ban husiar: Ka kali ka la rung ha ka jaka ba jur ka jingkhoh lum. Pynduna ia ka jingiaid bad pyntip sha ka control room.",
    lus: "Hriattirna: Motor chu lei tlahna hmun hlauhawmah a lut. A kal chak lutuk lo tur a ni a, control room hriattir nghal rawh.",
    mni: "Cheksinwa: Ching thiba maphamda gari changle. Speed hanthahanlu amasung control roomda pao pio.",
    brx: "सांग्रांथि: साप्लाय गारिया खौरां गनां हा सिबायनाय जायगायाव हाबबाय। सालायनायखौ खम खालाम आरो कन्ट्रोल रुमाव खौरां हर।",
  },
  RISK_SPIKE: {
    as: "বতৰ সতৰ্কবাণী: প্ৰৱল বৰষুণৰ ফলত পথৰ বিপদ মাত্ৰা বিপদজনকভাৱে বৃদ্ধি পাইছে। বিকল্প পথেৰে যাত্ৰা কৰিবলৈ পৰামৰ্শ দিয়া হৈছে।",
    hi: "मौसम चेतावनी: अत्यधिक भारी वर्षा के कारण इस गलियारे का जोखिम स्तर उच्च हो गया है। कृपया वैकल्पिक सुरक्षित मार्ग का उपयोग करें।",
    kha: "Ka jingma na ka jur u slap: Ka surok ka long kaba ma ban iaid. Sngewbha pyndonkam da kiwei pat ki surok.",
    lus: "Ruah sur nasat avangin kawng kal a hlauhawm hle. Kawng dang zawh turin kan inhriattir a ni.",
    mni: "Nong kanna chuba maramna lambi asida ching thibagi akiba leire. Atoppa lambi shijinabiyu.",
    brx: "अखा जोबोर गोख्रों हायनायनि थाखाय लामायाव खौरां गनां जादों। गुबुन लामा बाहायनायनि बिथोन होनाय जाबाय।",
  },
  SPEED_ANOMALY: {
    as: "প্ৰাথমিক সতৰ্কবাণী: কোনো আনুষ্ঠানিক প্ৰতিবেদন নোহোৱাকৈয়ে বাহনৰ গতি হঠাৎ স্থবিৰ হৈছে। সম্ভাৱ্য পথ অৱৰোধৰ সংকেত।",
    hi: "प्रारंभिक चेतावनी: कई वाहनों की गति में असामान्य मंदी दर्ज की गई है। संभवित अप्रत्याशित सड़क अवरोध।",
    kha: "Jingma kloi: Ki kali ki nang sangeh pathar ha kane ka surok. Lah ban don ka jingkhang surok.",
    lus: "Hriattirna: Motor kal a buai a, kawng a ping maithei tih entirna hmuh a ni.",
    mni: "Ahanba cheksinwa: Garising lambida tapna chattare, lambi thetpagum toure.",
    brx: "सिगां सांग्रांथि: लामायाव गारि सालायनाया गोख्रों दावगायाखै, लामा हेंथा जानायनि साननाय दं।",
  },
  FIELD_INCIDENT: {
    as: "ক্ষেত্ৰৰ পৰা প্ৰতিবেদন: কাৰ্যবাহী দলে ভূ-স্খলন বা পথ ভাঙি পৰাৰ প্ৰমাণ দাখিল কৰিছে। উদ্ধাৰকাৰী দল ৰাওনা হৈছে।",
    hi: "फील्ड रिपोर्ट: ग्राउंड टीम द्वारा भूस्खलन/मार्ग क्षति की पुष्टि की गई है। राहत एवं बचाव कार्य दल प्रस्थान कर चुका है।",
    kha: "Ka report na madan: Don ka jingkhoh lum kaba la wan jia. Ki kynhun iarap ki la mih ban leit iarap.",
    lus: "Report: Lei a tlah avangin kawng tlang theih loh a ni a, chhanhim hna thawk mektute an kal mek.",
    mni: "Field Officer pao: Ching thiraktuna lambi amuk leiraroi, relief team chatkhre.",
    brx: "ग्राउन्ड खौरां: हा सिबायनानै लामाया जोबोर गाज्रि जाबाय। फोसाबग्रा हान्जाया दावगाबाय।",
  },
};

export async function translateAlert(messageType, englishText) {
  const translations = {
    en: englishText,
  };

  // Preserve the exact operational message when translation is unavailable.
  // Legacy terminology is retained above for review, not substituted for facts.
  translations._meta = {
    provider: bhashiniReady() ? "BHASHINI" : "ENGLISH_FALLBACK",
    languages: {},
  };
  await Promise.all(
    ["as", "hi", "kha", "lus", "mni", "brx"].map(async (language) => {
      try {
        if (!bhashiniReady()) throw new Error("not configured");
        const result = await languageTask("translation", "en", language, {
          input: [{ source: englishText }],
        });
        const text = result.output?.[0]?.target;
        if (!text) throw new Error("translation unavailable");
        translations[language] = text;
        translations._meta.languages[language] = "TRANSLATED";
      } catch {
        translations[language] = englishText;
        translations._meta.languages[language] = "ENGLISH_FALLBACK";
      }
    }),
  );

  return translations;
}
