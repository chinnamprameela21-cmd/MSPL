var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
dotenv.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 8080;
  app.use(import_express.default.json());
  app.post("/api/gemini/advisor", async (req, res) => {
    try {
      const { prompt, chatHistory = [], context = {} } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt parameter is required." });
      }
      let apiKey = process.env.GEMINI_API_KEY || "AIzaSyDt8cQQvCP1A_Jjn7qoU4A9VwhjYMTjvS8";
      if (apiKey) {
        apiKey = apiKey.replace(/['"]/g, "").trim();
      }
      if (!apiKey) {
        const mockResponses = {
          "capabilities": "As **Magnifiq AI Advisor**, I stand ready to assist! Magnifiq Services Private Limited (formerly Tel Tower Private Limited) is leading telco towers and high-density PV solar grid installations. Live inventory holds structural modules, diesel generators, and 5G transceiver bands. You can customize shift assignments, coordinate optical fiber trenching, or authorize GPX-verified attendance logs.",
          "rfp": "### Turnkey 10-Tower Erection Proposal Draft\n\n**Prepared For:** Client Procurement Matrix\n**Prepared By:** Magnifiq Services Private Limited Engineering Division\n\n1. **Engineering Scope:** Supply, rigging, and certified foundation engineering for 10 structural lattice telecom towers.\n2. **Compliance Key:** 100% Guntur-monitored GPS clock-in telemetry to guarantee zero-spoof labor audit records.\n3. **Inventory Allocations:** 10 lattice tower kits, 10 backup heavy fuel diesel generators, and fiber patch panel junctions.\n\n*Activate your live `GEMINI_API_KEY` inside Settings > Secrets to unlock custom model-driven automatic estimates based on actual live items.*",
          "default": "Greetings! I am the **Magnifiq AI Advisor**. In order to connect this to real-time Gemini intelligence, please add your `GEMINI_API_KEY` in the **Settings > Secrets** panel in AI Studio.\n\nOnce configured, I can instantly query inventory status, draft custom RFP bids, formulate employee shift rosters, and optimize diesel generator consumption ratios live!"
        };
        let pickedResp = mockResponses.default;
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes("capability") || lowerPrompt.includes("installation") || lowerPrompt.includes("solar") || lowerPrompt.includes("tower")) {
          pickedResp = mockResponses.capabilities;
        } else if (lowerPrompt.includes("proposal") || lowerPrompt.includes("rfp") || lowerPrompt.includes("bid")) {
          pickedResp = mockResponses.rfp;
        }
        return res.json({
          text: pickedResp + "\n\n*(Note: To activate live AI, please save your `GEMINI_API_KEY` key in AI Studio's Secrets panel.)*",
          isDemo: true
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const systemInstruction = `You are Magnifiq AI Advisor, a super-intelligent engineering, logistics, and HR agent for Magnifiq Services Private Limited (formerly known as Tel Towers Private Limited).
Your headquarters are based in Hyderabad, Telangana, India.
The central HR working mailbox is hr@magnifiq.in for all dispatcher resolutions.
Magnifiq specializes in erecting heavy lattice towers, high-density fiber backhauls, optical fusion splicing, railway quad cabin signaling, and utility-scale PV solar farm grids.
Respond to user inquiries as a helpful corporate advisor. You have access to the following current corporate context:
- Current Live Inventory: ${context.inventoryCount || "dynamic telecon components"}
- Active Crew Members: ${context.employeesCount || "certified technicians"}
- Active Regional Projects: ${context.projectsCount || "turnkey installations"}

Provide authoritative, clear engineering and HR insights. Format your output using elegant Markdown with bold key terms, tables, or bullet points. Avoid clinical system telemetry references; remain polite, human, and professional.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...chatHistory.map((item) => ({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.text }]
          })),
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      return res.json({
        text: response.text || "I processed your request, but did not generate a text response."
      });
    } catch (error) {
      console.error("Gemini Advisor Endpoint Error:", error);
      return res.status(500).json({
        error: "Internal secure routing failure.",
        details: error.message || error
      });
    }
  });
  const distPath = import_path.default.join(process.cwd(), "dist");
  console.log(`\u{1F4C1} Serving static files from: ${distPath}`);
  if (!import_fs.default.existsSync(distPath)) {
    console.error(`\u274C ERROR: dist folder not found at ${distPath}`);
    process.exit(1);
  }
  app.use(import_express.default.static(distPath));
  app.get("/", (req, res) => {
    const indexPath = import_path.default.join(distPath, "index.html");
    console.log(`\u{1F4C4} Serving index.html from: ${indexPath}`);
    if (import_fs.default.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("index.html not found");
    }
  });
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    const indexPath = import_path.default.join(distPath, "index.html");
    if (import_fs.default.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("index.html not found");
    }
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2705 Server running on port ${PORT}`);
    console.log(`\u{1F310} Visit: https://msp1.up.railway.app`);
  });
}
startServer().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
