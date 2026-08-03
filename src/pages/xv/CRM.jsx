import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, Check, Loader2 } from "lucide-react";
import { money } from "@/lib/pricing";

const HUBSPOT_CONNECTOR_ID = "69db228b2439d854c8587167";
const STATUS_OPTIONS = ["all", "new", "qualified", "estimate_sent", "proposal_sent", "won", "lost", "follow_up"];

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [pushing, setPushing] = useState(null);

  useEffect(() => {
    fetchLeads();
    checkHubSpot();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const data = await base44.entities.Lead.list("-created_date", 100);
    setLeads(data);
    setLoading(false);
  };

  const checkHubSpot = async () => {
    try {
      const res = await fetch("/api/v1/functions/hubspot/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await res.json();
      setHubspotConnected(!!data.connected);
    } catch {
      setHubspotConnected(false);
    }
  };

  const connectHubSpot = async () => {
    const url = await base44.connectors.connectAppUser(HUBSPOT_CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        checkHubSpot();
      }
    }, 500);
  };

  const pushToHubSpot = async (lead) => {
    setPushing(lead.id);
    try {
      const res = await fetch("/api/v1/functions/hubspot/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pushLead",
          email: lead.email,
          firstname: lead.customer_name?.split(" ")[0] || "",
          lastname: lead.customer_name?.split(" ").slice(1).join(" ") || "",
          phone: lead.phone,
          address: lead.project_address,
          customer_name: lead.customer_name,
          floor_type: lead.floor_type,
          proposal_total: lead.proposal_total,
        }),
      });
      const data = await res.json();
      if (data.contactId) {
        await base44.entities.Lead.update(lead.id, {
          hubspot_contact_id: data.contactId,
          hubspot_deal_id: data.dealId,
        });
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPushing(null);
    }
  };

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.customer_name || "").toLowerCase().includes(q) || (l.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="National Concrete Polishing"
        title="CRM"
        description="Track every customer, proposal, and signature. Push leads to HubSpot and manage your follow-up pipeline."
        actions={
          <Button onClick={connectHubSpot} variant={hubspotConnected ? "outline" : "default"} className={hubspotConnected ? "" : "bg-[#FF7A59] hover:bg-[#FF7A59]/90 text-white"}>
            {hubspotConnected ? <><Check className="w-4 h-4 mr-1.5" /> HubSpot connected</> : <><ExternalLink className="w-4 h-4 mr-1.5" /> Connect HubSpot</>}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-slate-400">No customers found. Generate a proposal from the Visualizer to add customers to your CRM.</div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-[13px] min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Floor type</th>
                <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Sq ft</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
                <th className="text-center px-4 py-2.5 font-medium">Signed</th>
                <th className="text-center px-4 py-2.5 font-medium">HubSpot</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/app/xv/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">{lead.customer_name}</Link>
                    <p className="text-[11px] text-slate-500">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{lead.floor_type || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">{lead.square_feet?.toLocaleString() || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{lead.proposal_total ? money(lead.proposal_total) : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      lead.status === "won" ? "bg-emerald-100 text-emerald-700" :
                      lead.status === "proposal_sent" ? "bg-blue-100 text-blue-700" :
                      lead.status === "lost" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{(lead.status || "new").replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.signature_url ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.hubspot_contact_id ? <Check className="w-4 h-4 text-[#FF7A59] mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!lead.hubspot_contact_id && (
                      <Button size="sm" variant="outline" onClick={() => pushToHubSpot(lead)} disabled={pushing === lead.id || !hubspotConnected} className="h-7 text-[11px]">
                        {pushing === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                        Push
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!hubspotConnected && (
        <p className="text-[12px] text-slate-400 text-center">Connect your HubSpot account to push leads and deals automatically.</p>
      )}
    </div>
  );
}