import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CodeTextarea from "@/components/CodeTextarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import JsonTree from "@/components/JsonTree";
import DiffViewer from "@/components/DiffViewer";
import JSON5 from "json5";
import { parse as parseToml } from "smol-toml";
import { Search, Upload, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const Index = () => {
  const {
    toast
  } = useToast();
  const [srcJson, setSrcJson] = useState<string>("");
  const [srcToml, setSrcToml] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dataJson, setDataJson] = useState<any>(null);
  const [dataToml, setDataToml] = useState<any>(null);
  const [, setErrorJson] = useState<string | null>(null);
  const [errorPos, setErrorPos] = useState<{
    line: number;
    column: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"json" | "toml" | "compare">("json");
  const [parseJsonStrings, setParseJsonStrings] = useState<boolean>(false);

  // Compare mode states
  const [compareLeftJson, setCompareLeftJson] = useState<string>("");
  const [compareRightJson, setCompareRightJson] = useState<string>("");
  const [compareLeftToml, setCompareLeftToml] = useState<string>("");
  const [compareRightToml, setCompareRightToml] = useState<string>("");
  const [compareLeftData, setCompareLeftData] = useState<any>(null);
  const [compareRightData, setCompareRightData] = useState<any>(null);
  const [compareMode, setCompareMode] = useState<"json" | "toml">("json");

  // Function to preprocess JSON string before parsing
  const preprocessJsonString = (jsonString: string): string => {
    return jsonString.replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
  };

  // Function to recursively parse JSON strings in an object
  const parseJsonStringsInObject = (obj: any): any => {
    if (typeof obj === 'string') {
      try {
        // Check if string looks like JSON (starts with { or [)
        const trimmed = obj.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}') || trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const parsed = JSON5.parse(preprocessJsonString(obj));
          return parseJsonStringsInObject(parsed); // Recursively parse nested strings
        }
      } catch {
        // If parsing fails, return original string
      }
      return obj;
    } else if (Array.isArray(obj)) {
      return obj.map(item => parseJsonStringsInObject(item));
    } else if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = parseJsonStringsInObject(obj[key]);
        }
      }
      return result;
    }
    return obj;
  };
  useEffect(() => {
    document.title = "JSON & TOML Parser & Viewer – Pretty Print & Collapse";
  }, []);
  useEffect(() => {
    if (activeTab === "json") {
      try {
        let parsed = srcJson.trim() === "" ? null : JSON5.parse(preprocessJsonString(srcJson));
        // Apply JSON string parsing if enabled
        if (parsed !== null && parseJsonStrings) {
          parsed = parseJsonStringsInObject(parsed);
        }
        setDataJson(parsed);
        setErrorJson(null);
        setErrorPos(null);
      } catch (e: any) {
        setDataJson(null);
        setErrorJson(e?.message || "Parse error");

        // Simple error position parsing
        const errorMessage = e?.message || "Parse error";
        console.log("JSON Parse error:", errorMessage);
        const match = errorMessage.match(/at\s+(\d+):(\d+)/i);
        if (match) {
          const errorPos = {
            line: Number(match[1]),
            column: Number(match[2])
          };
          console.log("Error position found:", errorPos);
          setErrorPos(errorPos);
        } else {
          console.log("Could not parse error position from:", errorMessage);
          setErrorPos(null);
        }
      }
    } else if (activeTab === "toml") {
      try {
        const parsed = srcToml.trim() === "" ? null : parseToml(srcToml);
        setDataToml(parsed);
      } catch {
        setDataToml(null);
      }
    } else {
      setDataJson(null);
      setDataToml(null);
      setErrorJson(null);
      setErrorPos(null);
    }
  }, [srcJson, srcToml, activeTab, parseJsonStrings]);

  // Parse compare data
  useEffect(() => {
    if (activeTab === "compare") {
      if (compareMode === "json") {
        // Parse left JSON
        try {
          const leftParsed = compareLeftJson.trim() === "" ? null : JSON5.parse(preprocessJsonString(compareLeftJson));
          setCompareLeftData(leftParsed);
        } catch {
          setCompareLeftData(null);
        }

        // Parse right JSON
        try {
          const rightParsed = compareRightJson.trim() === "" ? null : JSON5.parse(preprocessJsonString(compareRightJson));
          setCompareRightData(rightParsed);
        } catch {
          setCompareRightData(null);
        }
      } else {
        // Parse left TOML
        try {
          const leftParsed = compareLeftToml.trim() === "" ? null : parseToml(compareLeftToml);
          setCompareLeftData(leftParsed);
        } catch {
          setCompareLeftData(null);
        }

        // Parse right TOML
        try {
          const rightParsed = compareRightToml.trim() === "" ? null : parseToml(compareRightToml);
          setCompareRightData(rightParsed);
        } catch {
          setCompareRightData(null);
        }
      }
    }
  }, [compareLeftJson, compareRightJson, compareLeftToml, compareRightToml, activeTab, compareMode]);
  const pretty = useMemo(() => {
    try {
      return dataJson === null ? "" : JSON.stringify(dataJson, null, 2);
    } catch {
      return "";
    }
  }, [dataJson]);
  const prettyToml = useMemo(() => {
    try {
      return dataToml === null ? "" : JSON.stringify(dataToml, null, 2);
    } catch {
      return "";
    }
  }, [dataToml]);
  const onCopy = async () => {
    const textToCopy = activeTab === "json" ? pretty : prettyToml;
    if (!textToCopy) return;
    await navigator.clipboard.writeText(textToCopy);
    toast({
      description: `${activeTab.toUpperCase()} data copied to clipboard`
    });
  };
  const onFormat = () => {
    if (!pretty) return;
    setSrcJson(pretty);
  };
  const onClear = () => {
    if (activeTab === "json") {
      setSrcJson("");
      setDataJson(null);
      setErrorJson(null);
      setErrorPos(null);
    } else if (activeTab === "toml") {
      setSrcToml("");
    } else if (activeTab === "compare") {
      if (compareMode === "json") {
        setCompareLeftJson("");
        setCompareRightJson("");
      } else {
        setCompareLeftToml("");
        setCompareRightToml("");
      }
      setCompareLeftData(null);
      setCompareRightData(null);
    }
  };
  const onLoadFile = (fileType: "json" | "toml") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = fileType === "json" ? ".json,.json5" : ".toml";
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        if (fileType === "json") {
          setSrcJson(content);
        } else {
          setSrcToml(content);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  const onLoadCompareFile = (side: "left" | "right", fileType: "json" | "toml") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = fileType === "json" ? ".json,.json5" : ".toml";
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        if (side === "left") {
          if (fileType === "json") setCompareLeftJson(content);else setCompareLeftToml(content);
        } else {
          if (fileType === "json") setCompareRightJson(content);else setCompareRightToml(content);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  const onClearCompare = (side: "left" | "right") => {
    if (side === "left") {
      if (compareMode === "json") {
        setCompareLeftJson("");
      } else {
        setCompareLeftToml("");
      }
      setCompareLeftData(null);
    } else {
      if (compareMode === "json") {
        setCompareRightJson("");
      } else {
        setCompareRightToml("");
      }
      setCompareRightData(null);
    }
  };
  return <TooltipProvider>
    <main className="min-h-screen bg-gray-50">
      <section className="container py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
            JSON & TOML Parser & Viewer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">Smart json parser/viewer, toml parser.</p>
        </header>

        <div className="mb-8 flex justify-center">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "json" | "toml" | "compare")} className="w-full max-w-lg">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger value="json" className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 font-medium">
                JSON
              </TabsTrigger>
              <TabsTrigger value="toml" className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 font-medium">
                TOML
              </TabsTrigger>
              <TabsTrigger value="compare" className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 font-medium">
                Compare
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "compare" && <div className="mb-6 flex justify-center">
            <Tabs value={compareMode} onValueChange={v => setCompareMode(v as "json" | "toml")} className="w-full max-w-sm">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="json">JSON Compare</TabsTrigger>
                <TabsTrigger value="toml">TOML Compare</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>}

        {activeTab === "compare" ? <>
            {/* Compare Mode */}
            <div className="grid gap-8 lg:grid-cols-2 mb-8">
              <Card className="shadow-lg border bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Left {compareMode.toUpperCase()}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => onLoadCompareFile("left", compareMode)} className="transition-all duration-300 font-medium">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Load File</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => onClearCompare("left")} className="transition-all duration-300 font-medium">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeTextarea value={compareMode === "json" ? compareLeftJson : compareLeftToml} onChange={e => {
                  const val = e.target.value;
                  if (compareMode === "json") setCompareLeftJson(val);else setCompareLeftToml(val);
                }} placeholder={`Paste left ${compareMode.toUpperCase()} here...`} className="min-h-[250px] font-mono text-sm border bg-white transition-all duration-300 focus:ring-2 focus:ring-primary resize-none" searchTerm={searchTerm} />
                </CardContent>
              </Card>

              <Card className="shadow-lg border bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Right {compareMode.toUpperCase()}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => onLoadCompareFile("right", compareMode)} className="transition-all duration-300 font-medium">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Load File</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => onClearCompare("right")} className="transition-all duration-300 font-medium">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeTextarea value={compareMode === "json" ? compareRightJson : compareRightToml} onChange={e => {
                  const val = e.target.value;
                  if (compareMode === "json") setCompareRightJson(val);else setCompareRightToml(val);
                }} placeholder={`Paste right ${compareMode.toUpperCase()} here...`} className="min-h-[250px] font-mono text-sm border bg-white transition-all duration-300 focus:ring-2 focus:ring-primary resize-none" searchTerm={searchTerm} />
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Diff Viewer
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Show no differences indicator */}
                    {compareLeftData !== null && compareRightData !== null && (() => {
                    try {
                      const leftJson = JSON.stringify(compareLeftData, null, 2);
                      const rightJson = JSON.stringify(compareRightData, null, 2);
                      const hasDifferences = leftJson !== rightJson;
                      return !hasDifferences ? <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            ✅ No differences
                          </div> : null;
                    } catch {
                      return null;
                    }
                  })()}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={onClear} className="transition-all duration-300 font-medium">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear All Data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="min-h-[400px]">
                  {compareLeftData !== null || compareRightData !== null ? <DiffViewer leftData={compareLeftData} rightData={compareRightData} leftLabel={`Left ${compareMode.toUpperCase()}`} rightLabel={`Right ${compareMode.toUpperCase()}`} /> : <div className="p-8 text-center text-muted-foreground">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                        <div className="text-2xl">🔍</div>
                      </div>
                      <p className="text-lg font-medium mb-2">Ready to compare</p>
                      <p className="text-sm">Paste your {compareMode.toUpperCase()} data on both sides to see differences</p>
                    </div>}
                </div>
              </CardContent>
            </Card>
          </> : <div className="grid gap-8 lg:grid-cols-2">
            <Card className="shadow-lg border bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Input
                  </CardTitle>
                <div className="flex items-center gap-4">
                  {activeTab === "json" && <div className="flex items-center gap-2">
                      <Checkbox id="parse-json-strings" checked={parseJsonStrings} onCheckedChange={checked => setParseJsonStrings(checked === true)} />
                      <label htmlFor="parse-json-strings" className="text-sm font-medium text-muted-foreground cursor-pointer">
                        Parse JSON strings
                      </label>
                    </div>}
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search content..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-40 h-8" />
                  </div>
                </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeTextarea value={activeTab === "json" ? srcJson : srcToml} onChange={e => {
                const val = e.target.value;
                if (activeTab === "json") setSrcJson(val);else setSrcToml(val);
              }} placeholder={activeTab === "json" ? "Paste JSON or JSON5 here..." : "Paste TOML here..."} className="min-h-[320px] font-mono text-sm border bg-white transition-all duration-300 focus:ring-2 focus:ring-primary resize-none" errorPos={activeTab === "json" ? errorPos : undefined} searchTerm={searchTerm} />
                <div className="flex flex-wrap gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="default" size="sm" onClick={() => onLoadFile(activeTab as "json" | "toml")} className="transition-all duration-300 font-medium">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Load File</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="sm" onClick={onCopy} disabled={activeTab === "json" ? !pretty : !prettyToml} className="transition-all duration-300 font-medium">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Output</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onClear} className="transition-all duration-300 font-medium">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Viewer
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onCopy} disabled={activeTab === "json" ? !pretty : !prettyToml} className="transition-all duration-300 font-medium">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Formatted Data</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  {activeTab === "json" ? <>
                      {dataJson === null && <div className="p-8 text-center text-muted-foreground">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                            <div className="text-2xl">📝</div>
                          </div>
                          <p className="text-lg font-medium mb-2">Ready to parse</p>
                          <p className="text-sm">Paste your JSON to begin visualization</p>
                        </div>}
                      {dataJson !== null && <div className="p-6 bg-white">
                          <JsonTree data={dataJson} collapsedDepth={2} searchTerm={searchTerm} />
                        </div>}
                    </> : <>
                      {dataToml === null && <div className="p-8 text-center text-muted-foreground">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                            <div className="text-2xl">⚙️</div>
                          </div>
                          <p className="text-lg font-medium mb-2">Ready to parse</p>
                          <p className="text-sm">Paste your TOML to begin visualization</p>
                        </div>}
                      {dataToml !== null && <div className="p-6 bg-white">
                          <JsonTree data={dataToml} collapsedDepth={2} searchTerm={searchTerm} />
                        </div>}
                    </>}
                </div>
              </CardContent>
            </Card>
          </div>}
      </section>
      
      {/* Footer */}
      <footer className="text-center py-4 text-sm text-muted-foreground border-t">
        <a href="https://segwise.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
          Built with ❤️ by Team Segwise
        </a>
      </footer>
    </main>
  </TooltipProvider>;
};
export default Index;