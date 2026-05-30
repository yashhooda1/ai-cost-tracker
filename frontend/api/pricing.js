const rows = [
  { provider:"openai",    model:"gpt-4o",                        input_per_1m:2.50,  output_per_1m:10.00 },
  { provider:"openai",    model:"gpt-4o-mini",                   input_per_1m:0.15,  output_per_1m:0.60  },
  { provider:"openai",    model:"gpt-4-turbo",                   input_per_1m:10.00, output_per_1m:30.00 },
  { provider:"openai",    model:"gpt-3.5-turbo",                 input_per_1m:0.50,  output_per_1m:1.50  },
  { provider:"openai",    model:"o1",                            input_per_1m:15.00, output_per_1m:60.00 },
  { provider:"openai",    model:"o3-mini",                       input_per_1m:1.10,  output_per_1m:4.40  },
  { provider:"anthropic", model:"claude-opus-4-8",               input_per_1m:15.00, output_per_1m:75.00 },
  { provider:"anthropic", model:"claude-sonnet-4-6",             input_per_1m:3.00,  output_per_1m:15.00 },
  { provider:"anthropic", model:"claude-haiku-4-5-20251001",     input_per_1m:0.80,  output_per_1m:4.00  },
  { provider:"anthropic", model:"claude-3-5-sonnet-20241022",    input_per_1m:3.00,  output_per_1m:15.00 },
  { provider:"anthropic", model:"claude-3-haiku-20240307",       input_per_1m:0.25,  output_per_1m:1.25  },
  { provider:"google",    model:"gemini-2.5-pro",                input_per_1m:1.25,  output_per_1m:10.00 },
  { provider:"google",    model:"gemini-2.0-flash",              input_per_1m:0.10,  output_per_1m:0.40  },
  { provider:"google",    model:"gemini-1.5-pro",                input_per_1m:3.50,  output_per_1m:10.50 },
  { provider:"google",    model:"gemini-1.5-flash",              input_per_1m:0.075, output_per_1m:0.30  },
];
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(rows);
}
