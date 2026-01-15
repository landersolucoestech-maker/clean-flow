import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Save, 
  Eye, 
  Building2,
  User,
  Palette,
  Calendar,
  Home,
  Plus,
  Trash2,
  Settings2,
  FileText,
} from "lucide-react";

// Room services configuration
const DEFAULT_ROOM_SERVICES = {
  kitchen: {
    label: "KITCHEN",
    items: [
      "Clean major appliance exteriors (interior upon request)",
      "Dust window sills",
      "Clean table and chairs",
      "Clean microwave - interior & exterior",
      "Clean/disinfect/polish sinks & faucets",
      "Clean and disinfect counters & backsplash",
      "Clean floors (vacuum, sweep, mop)",
      "Wipe doors, handles & light switches",
      "Wipe outside cabinets & drawers",
      "Remove cobwebs",
      "Empty trash and replace liner",
      "Dust baseboards",
    ],
  },
  bathroom: {
    label: "BATHROOM",
    items: [
      "Clean tub shower door and inside of the shower",
      "Clean and polish countertop, sinks, and faucets",
      "Clean mirrors",
      "Dust window sills",
      "Clean and disinfect towel bars",
      "Dust picture frames",
      "Fold and hang towels neatly",
      "Empty trash and replace liner",
      "Remove cobwebs",
      "Clean & sanitize toilets in/out",
      "Wipe doors, handles & light switches",
      "Clean floors (vacuum, sweep, mop)",
      "Clean exterior of vanities",
      "Dust baseboards",
    ],
  },
  bedroom: {
    label: "BEDROOM",
    items: [
      "Clean floors (vacuum, sweep, mop)",
      "Dust baseboards",
      "Dust furniture within reach (top, front & underneath)",
      "Clean mirrors and glass surfaces",
      "Dust window sills",
      "Remove cobwebs",
      "Dust lamps and lamp shades",
      "Dust picture frames",
      "Wipe doors, handles & light switches",
      "Dust light fixtures, ceiling fans, and vents",
      "Empty trash and replace liner",
    ],
  },
  diningLiving: {
    label: "DINING ROOM LIVING AREAS",
    items: [
      "Vacuum/dust upholstered furniture",
      "Dust lamps and lamp shades",
      "Dust furniture within reach (top, front & underneath)",
      "Dust picture frames",
      "Dust windowsills",
      "Clean counters & backsplash",
      "Clean mirrors and glass surfaces",
      "Empty trash and replace liner",
      "Clean floors (vacuum, sweep, mop)",
      "Remove cobwebs",
      "Wipe doors & light switches",
      "Dust baseboards",
    ],
  },
  laundryRoom: {
    label: "LAUNDRY ROOM",
    items: [
      "Dust windowsills",
      "Wipe tops of washer and dryer",
      "Empty trash and replace liner",
      "Clean floors (vacuum, sweep, mop)",
      "Remove cobwebs",
      "Wipe doors, handles & light switches",
      "Wipe outside cabinets and drawers",
      "Dust baseboards",
    ],
  },
  addOns: {
    label: "ADD-ON SERVICES",
    items: [
      "Clean inside refrigerator",
      "Clean inside oven",
      "Clean the garage",
      "Clean inside cabinets",
    ],
    note: "*By request only",
  },
} as const;

interface PricingRow {
  id: string;
  label: string;
}

interface NoteItem {
  id: string;
  text: string;
}

interface EstimateTemplateConfig {
  // Company Info
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
  companyEmail: string;
  companyPhone: string;

  // Document Title
  documentTitle: string;

  // Client Fields
  showClient: boolean;
  showDate: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showEmail: boolean;
  showReferenceBy: boolean;

  // Preferences
  showPreferencesDays: boolean;
  preferencesDays: string[];
  showPreferencesTime: boolean;
  preferencesTime: string[];
  showFrequency: boolean;
  frequencyOptions: string[];

  // Room Services
  enabledRooms: {
    kitchen: boolean;
    bathroom: boolean;
    bedroom: boolean;
    diningLiving: boolean;
    laundryRoom: boolean;
    addOns: boolean;
  };
  roomServices: typeof DEFAULT_ROOM_SERVICES;

  // Pricing Section
  pricingRows: PricingRow[];

  // Notes Section
  notesTitle: string;
  noteItems: NoteItem[];

  // Quote By
  showQuoteBy: boolean;
  quoteByLabel: string;

  // Styling
  primaryColor: string;
  secondaryColor: string;
  borderColor: string;
  fontFamily: string;
}

const defaultConfig: EstimateTemplateConfig = {
  companyName: "MH Cleaning Service Inc",
  companyAddress: "1427 Reidhaven St, Matthews NC, 28105",
  companyWebsite: "mhcleanservices.com",
  companyEmail: "maria@mhcleanservices.com",
  companyPhone: "704-426-7626",

  documentTitle: "ESTIMATE",

  showClient: true,
  showDate: true,
  showPhone: true,
  showAddress: true,
  showEmail: true,
  showReferenceBy: true,

  showPreferencesDays: true,
  preferencesDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  showPreferencesTime: true,
  preferencesTime: ["AM", "PM"],
  showFrequency: true,
  frequencyOptions: ["Weekly", "Regular Cleaning 2 Weeks", "Regular Cleaning 4 Weeks"],

  enabledRooms: {
    kitchen: true,
    bathroom: true,
    bedroom: true,
    diningLiving: true,
    laundryRoom: true,
    addOns: true,
  },
  roomServices: { ...DEFAULT_ROOM_SERVICES },

  pricingRows: [
    { id: "1", label: "First deep cleaning" },
    { id: "2", label: "" },
    { id: "3", label: "" },
  ],

  notesTitle: "Note:",
  noteItems: [
    { id: "1", text: "This estimate has a 30 day validation." },
  ],

  showQuoteBy: true,
  quoteByLabel: "Quote by:",

  primaryColor: "#1e40af",
  secondaryColor: "#166534",
  borderColor: "#3b82f6",
  fontFamily: "Inter",
};

interface LeadEstimateTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

let savedEstimateConfig: EstimateTemplateConfig | null = null;

export function LeadEstimateTemplateEditor({ open, onOpenChange }: LeadEstimateTemplateEditorProps) {
  const [config, setConfig] = useState<EstimateTemplateConfig>(
    savedEstimateConfig || defaultConfig
  );
  const [activeTab, setActiveTab] = useState("company");

  const updateConfig = <K extends keyof EstimateTemplateConfig>(
    key: K, 
    value: EstimateTemplateConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleRoom = (roomKey: keyof typeof config.enabledRooms) => {
    setConfig(prev => ({
      ...prev,
      enabledRooms: {
        ...prev.enabledRooms,
        [roomKey]: !prev.enabledRooms[roomKey],
      },
    }));
  };

  const addPricingRow = () => {
    setConfig(prev => ({
      ...prev,
      pricingRows: [...prev.pricingRows, { id: Date.now().toString(), label: "" }],
    }));
  };

  const removePricingRow = (id: string) => {
    setConfig(prev => ({
      ...prev,
      pricingRows: prev.pricingRows.filter(r => r.id !== id),
    }));
  };

  const updatePricingRow = (id: string, label: string) => {
    setConfig(prev => ({
      ...prev,
      pricingRows: prev.pricingRows.map(r => r.id === id ? { ...r, label } : r),
    }));
  };

  const addNoteItem = () => {
    setConfig(prev => ({
      ...prev,
      noteItems: [...prev.noteItems, { id: Date.now().toString(), text: "" }],
    }));
  };

  const removeNoteItem = (id: string) => {
    setConfig(prev => ({
      ...prev,
      noteItems: prev.noteItems.filter(n => n.id !== id),
    }));
  };

  const updateNoteItem = (id: string, text: string) => {
    setConfig(prev => ({
      ...prev,
      noteItems: prev.noteItems.map(n => n.id === id ? { ...n, text } : n),
    }));
  };

  const handleSave = () => {
    savedEstimateConfig = config;
    toast.success("Estimate template saved successfully!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Edit Estimate Template
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          <div className="w-1/2 border-r border-border overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="company" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1" />
                  Company
                </TabsTrigger>
                <TabsTrigger value="client" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  Client
                </TabsTrigger>
                <TabsTrigger value="preferences" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Preferences
                </TabsTrigger>
                <TabsTrigger value="rooms" className="text-xs">
                  <Home className="w-3 h-3 mr-1" />
                  Rooms
                </TabsTrigger>
                <TabsTrigger value="footer" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Footer
                </TabsTrigger>
              </TabsList>

              {/* Company Tab */}
              <TabsContent value="company" className="space-y-4">
                <h3 className="font-semibold">Company Information</h3>

                <div className="space-y-2">
                  <Label>Document Title</Label>
                  <Input 
                    value={config.documentTitle}
                    onChange={(e) => updateConfig("documentTitle", e.target.value)}
                    placeholder="ESTIMATE"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={config.companyName}
                    onChange={(e) => updateConfig("companyName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input 
                    value={config.companyAddress}
                    onChange={(e) => updateConfig("companyAddress", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input 
                      value={config.companyWebsite}
                      onChange={(e) => updateConfig("companyWebsite", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      value={config.companyEmail}
                      onChange={(e) => updateConfig("companyEmail", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={config.companyPhone}
                    onChange={(e) => updateConfig("companyPhone", e.target.value)}
                  />
                </div>

                <Separator />
                <h4 className="font-medium">Styling</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color (Blue)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input 
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Color (Green)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => updateConfig("secondaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input 
                        value={config.secondaryColor}
                        onChange={(e) => updateConfig("secondaryColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Border Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={config.borderColor}
                      onChange={(e) => updateConfig("borderColor", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={config.borderColor}
                      onChange={(e) => updateConfig("borderColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Client Tab */}
              <TabsContent value="client" className="space-y-4">
                <h3 className="font-semibold">Client Information Fields</h3>
                <p className="text-sm text-muted-foreground">Choose which fields to display</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Client Name</Label>
                    <Switch 
                      checked={config.showClient} 
                      onCheckedChange={(v) => updateConfig("showClient", v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Date</Label>
                    <Switch 
                      checked={config.showDate} 
                      onCheckedChange={(v) => updateConfig("showDate", v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Phone</Label>
                    <Switch 
                      checked={config.showPhone} 
                      onCheckedChange={(v) => updateConfig("showPhone", v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Address</Label>
                    <Switch 
                      checked={config.showAddress} 
                      onCheckedChange={(v) => updateConfig("showAddress", v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Email</Label>
                    <Switch 
                      checked={config.showEmail} 
                      onCheckedChange={(v) => updateConfig("showEmail", v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Reference By</Label>
                    <Switch 
                      checked={config.showReferenceBy} 
                      onCheckedChange={(v) => updateConfig("showReferenceBy", v)} 
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-4">
                <h3 className="font-semibold">Preferences Days</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Show Preferences Days</Label>
                  <Switch 
                    checked={config.showPreferencesDays} 
                    onCheckedChange={(v) => updateConfig("showPreferencesDays", v)} 
                  />
                </div>

                <Separator />
                <h3 className="font-semibold">Preferences Time</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Show Preferences Time</Label>
                  <Switch 
                    checked={config.showPreferencesTime} 
                    onCheckedChange={(v) => updateConfig("showPreferencesTime", v)} 
                  />
                </div>

                <Separator />
                <h3 className="font-semibold">Frequency</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Show Frequency</Label>
                  <Switch 
                    checked={config.showFrequency} 
                    onCheckedChange={(v) => updateConfig("showFrequency", v)} 
                  />
                </div>
              </TabsContent>

              {/* Rooms Tab */}
              <TabsContent value="rooms" className="space-y-4">
                <h3 className="font-semibold">Room Service Cards</h3>
                <p className="text-sm text-muted-foreground">Enable/disable room cards</p>

                <div className="space-y-3">
                  {(Object.keys(config.enabledRooms) as Array<keyof typeof config.enabledRooms>).map((roomKey) => {
                    const room = DEFAULT_ROOM_SERVICES[roomKey];
                    return (
                      <div 
                        key={roomKey}
                        className={`p-3 border rounded-lg ${config.enabledRooms[roomKey] ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">{room.label}</Label>
                          <Switch 
                            checked={config.enabledRooms[roomKey]} 
                            onCheckedChange={() => toggleRoom(roomKey)} 
                          />
                        </div>
                        {config.enabledRooms[roomKey] && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {room.items.length} services included
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Footer Tab */}
              <TabsContent value="footer" className="space-y-4">
                <h3 className="font-semibold">Pricing Rows</h3>
                <p className="text-sm text-muted-foreground">Configure service pricing lines</p>

                <div className="space-y-2">
                  {config.pricingRows.map((row, index) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                      <Input 
                        value={row.label}
                        onChange={(e) => updatePricingRow(row.id, e.target.value)}
                        placeholder="Service description..."
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removePricingRow(row.id)}
                        disabled={config.pricingRows.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPricingRow}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Row
                  </Button>
                </div>

                <Separator />
                <h3 className="font-semibold">Notes Section</h3>

                <div className="space-y-2">
                  <Label>Notes Title</Label>
                  <Input 
                    value={config.notesTitle}
                    onChange={(e) => updateConfig("notesTitle", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  {config.noteItems.map((note, index) => (
                    <div key={note.id} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                      <Input 
                        value={note.text}
                        onChange={(e) => updateNoteItem(note.id, e.target.value)}
                        placeholder="Note text..."
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeNoteItem(note.id)}
                        disabled={config.noteItems.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addNoteItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>

                <Separator />
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Show Quote By</Label>
                    <p className="text-xs text-muted-foreground">Signature field for staff</p>
                  </div>
                  <Switch 
                    checked={config.showQuoteBy} 
                    onCheckedChange={(v) => updateConfig("showQuoteBy", v)} 
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 bg-gray-100 overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Live Preview</span>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                {/* Page 1 */}
                <div 
                  className="bg-white shadow-lg mb-4 overflow-hidden"
                  style={{ fontFamily: config.fontFamily, fontSize: '10px' }}
                >
                  {/* Header */}
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h1 
                        className="text-2xl font-bold"
                        style={{ color: config.primaryColor }}
                      >
                        {config.documentTitle}
                      </h1>
                      <div 
                        className="w-24 h-6 border-2 rounded"
                        style={{ borderColor: config.primaryColor }}
                      />
                    </div>
                    <div 
                      className="w-20 h-16 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: config.secondaryColor }}
                    >
                      LOGO
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="px-4 space-y-2">
                    {config.showClient && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: config.primaryColor }}>Client:</span>
                        <div className="flex-1 h-6 border-b-2" style={{ borderColor: config.primaryColor }} />
                      </div>
                    )}
                    <div className="flex gap-4">
                      {config.showDate && (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-semibold" style={{ color: config.primaryColor }}>Date:</span>
                          <div className="flex-1 h-6 border-b-2" style={{ borderColor: config.primaryColor }} />
                        </div>
                      )}
                      {config.showPhone && (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-semibold" style={{ color: config.primaryColor }}>Phone:</span>
                          <div className="flex-1 h-6 border-b-2" style={{ borderColor: config.primaryColor }} />
                        </div>
                      )}
                    </div>
                    {config.showAddress && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: config.primaryColor }}>Address:</span>
                        <div className="flex-1 h-6 border-b-2" style={{ borderColor: config.primaryColor }} />
                      </div>
                    )}
                    {config.showEmail && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: config.primaryColor }}>Email:</span>
                        <div className="flex-1 h-6 border-b-2" style={{ borderColor: config.primaryColor }} />
                      </div>
                    )}
                    {config.showReferenceBy && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: config.primaryColor }}>Reference By:</span>
                        <div className="flex-1 h-6 border-b-2" style={{ borderColor: config.primaryColor }} />
                      </div>
                    )}
                  </div>

                  {/* Preferences */}
                  <div className="px-4 py-3">
                    <div className="flex gap-8">
                      {config.showPreferencesDays && (
                        <div>
                          <h3 
                            className="font-bold italic text-sm mb-2 border-b-2"
                            style={{ color: config.secondaryColor, borderColor: config.secondaryColor }}
                          >
                            Preferences days
                          </h3>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {config.preferencesDays.map(day => (
                              <div key={day} className="flex items-center gap-1">
                                <div className="w-4 h-4 border-2 rounded" style={{ borderColor: config.primaryColor }} />
                                <span className="font-medium">{day}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {config.showPreferencesTime && (
                        <div>
                          <h3 
                            className="font-bold italic text-sm mb-2 border-b-2"
                            style={{ color: config.secondaryColor, borderColor: config.secondaryColor }}
                          >
                            Preferences time
                          </h3>
                          <div className="flex gap-4">
                            {config.preferencesTime.map(time => (
                              <div key={time} className="flex items-center gap-1">
                                <div className="w-4 h-4 border-2 rounded" style={{ borderColor: config.primaryColor }} />
                                <span className="font-medium">{time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {config.showFrequency && (
                      <div className="mt-3">
                        <h3 
                          className="font-bold italic text-sm mb-2 border-b-2 inline-block"
                          style={{ color: config.secondaryColor, borderColor: config.secondaryColor }}
                        >
                          Frequency
                        </h3>
                        <div className="flex gap-4">
                          {config.frequencyOptions.map(freq => (
                            <div key={freq} className="flex items-center gap-1">
                              <div className="w-4 h-4 border-2 rounded" style={{ borderColor: config.primaryColor }} />
                              <span className="font-medium">{freq}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Room Service Cards - First Row */}
                  <div className="px-4 pb-3">
                    <div 
                      className="grid grid-cols-3 gap-2 p-2 border-2 rounded-lg"
                      style={{ borderColor: config.borderColor }}
                    >
                      {config.enabledRooms.kitchen && (
                        <RoomCard 
                          room={DEFAULT_ROOM_SERVICES.kitchen} 
                          primaryColor={config.primaryColor}
                        />
                      )}
                      {config.enabledRooms.bathroom && (
                        <RoomCard 
                          room={DEFAULT_ROOM_SERVICES.bathroom} 
                          primaryColor={config.primaryColor}
                        />
                      )}
                      {config.enabledRooms.bedroom && (
                        <RoomCard 
                          room={DEFAULT_ROOM_SERVICES.bedroom} 
                          primaryColor={config.primaryColor}
                        />
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div 
                    className="p-3 text-white flex justify-between items-center"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <div className="text-xs">
                      <p className="font-bold" style={{ color: config.secondaryColor }}>{config.companyName}</p>
                      <p>📍 {config.companyAddress}</p>
                      <p>🌐 {config.companyWebsite}</p>
                      <p>✉️ {config.companyEmail}</p>
                      <p>📞 {config.companyPhone}</p>
                    </div>
                    <div 
                      className="w-16 h-12 rounded flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: config.secondaryColor }}
                    >
                      LOGO
                    </div>
                  </div>
                </div>

                {/* Page 2 */}
                <div 
                  className="bg-white shadow-lg overflow-hidden"
                  style={{ fontFamily: config.fontFamily, fontSize: '10px' }}
                >
                  {/* Room Service Cards - Second Row */}
                  <div className="p-4">
                    <div 
                      className="grid grid-cols-3 gap-2 p-2 border-2 rounded-lg"
                      style={{ borderColor: config.borderColor }}
                    >
                      {config.enabledRooms.diningLiving && (
                        <RoomCard 
                          room={DEFAULT_ROOM_SERVICES.diningLiving} 
                          primaryColor={config.primaryColor}
                        />
                      )}
                      {config.enabledRooms.laundryRoom && (
                        <RoomCard 
                          room={DEFAULT_ROOM_SERVICES.laundryRoom} 
                          primaryColor={config.primaryColor}
                        />
                      )}
                      {config.enabledRooms.addOns && (
                        <AddOnCard 
                          room={DEFAULT_ROOM_SERVICES.addOns} 
                          primaryColor={config.primaryColor}
                        />
                      )}
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="px-4 py-2">
                    <div 
                      className="border-2 rounded-lg overflow-hidden"
                      style={{ borderColor: config.borderColor }}
                    >
                      {config.pricingRows.map((row, index) => (
                        <div 
                          key={row.id}
                          className={`flex items-center ${index > 0 ? 'border-t-2' : ''}`}
                          style={{ borderColor: config.borderColor }}
                        >
                          <div className="flex-1 p-2">
                            <span className="font-bold text-sm">{row.label}</span>
                          </div>
                          <div 
                            className="w-20 p-2 text-center font-bold text-lg border-l-2"
                            style={{ borderColor: config.borderColor, color: config.primaryColor }}
                          >
                            $
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="px-4 py-3">
                    <h3 
                      className="font-bold italic text-sm mb-2 border-b-2 inline-block"
                      style={{ color: config.secondaryColor, borderColor: config.secondaryColor }}
                    >
                      {config.notesTitle}
                    </h3>
                    <div className="space-y-1">
                      {config.noteItems.map((note, index) => (
                        <p key={note.id} className="font-medium">
                          {index + 1}. {note.text}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Quote By */}
                  {config.showQuoteBy && (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{config.quoteByLabel}</span>
                        <div 
                          className="flex-1 max-w-xs h-6 border-2 rounded"
                          style={{ borderColor: config.primaryColor }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div 
                    className="p-3 text-white flex justify-between items-center mt-4"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <div className="text-xs">
                      <p className="font-bold" style={{ color: config.secondaryColor }}>{config.companyName}</p>
                      <p>📍 {config.companyAddress}</p>
                      <p>🌐 {config.companyWebsite}</p>
                      <p>✉️ {config.companyEmail}</p>
                      <p>📞 {config.companyPhone}</p>
                    </div>
                    <div 
                      className="w-16 h-12 rounded flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: config.secondaryColor }}
                    >
                      LOGO
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Room Card Component
function RoomCard({ room, primaryColor }: { room: { label: string; items: readonly string[] }; primaryColor: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <div className="w-3 h-3 border-2" style={{ borderColor: primaryColor }} />
        <span className="font-bold text-xs" style={{ color: primaryColor }}>{room.label}</span>
      </div>
      <div className="space-y-0.5">
        {room.items.map((item, idx) => (
          <p key={idx} className="text-[8px] leading-tight">• {item}</p>
        ))}
      </div>
    </div>
  );
}

// Add-On Card Component (with individual checkboxes)
function AddOnCard({ room, primaryColor }: { room: { label: string; items: readonly string[]; note?: string }; primaryColor: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 mb-1">
        <div className="w-3 h-3 border-2" style={{ borderColor: primaryColor }} />
        <span className="font-bold text-xs" style={{ color: primaryColor }}>{room.label}</span>
      </div>
      <div className="space-y-1">
        {room.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <div className="w-3 h-3 border" style={{ borderColor: primaryColor }} />
            <span className="text-[8px]">{item}</span>
          </div>
        ))}
        {room.note && (
          <p className="text-[7px] text-gray-500 mt-1">{room.note}</p>
        )}
      </div>
    </div>
  );
}