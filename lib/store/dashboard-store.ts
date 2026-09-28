import { create } from 'zustand';

interface UserProfile {
  citizen_uid?: string;
  officer_uid?: string;
  full_name: string;
  email?: string;
  role?: string;
  role_code?: string;
  jurisdiction_name?: string;
  jurisdiction_type?: string;
  permissions: string[];
}

interface DashboardState {
  user: UserProfile | null;
  parcels: any[];
  transfers: any[];
  taxes: any[];
  disputes: any[];
  khajanaZones: any[];
  loading: boolean;
  
  // Actions
  fetchCitizenData: () => Promise<void>;
  fetchOfficerData: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setTransfers: (transfers: any[]) => void;
  setDisputes: (disputes: any[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  user: null,
  parcels: [],
  transfers: [],
  taxes: [],
  disputes: [],
  khajanaZones: [],
  loading: true,

  setUser: (user) => set({ user }),
  setTransfers: (transfers) => set({ transfers }),
  setDisputes: (disputes) => set({ disputes }),

  fetchCitizenData: async () => {
    set({ loading: true });
    try {
      const [meRes, parcelsRes, transfersRes, taxesRes, disputesRes] = await Promise.all([
        fetch('/api/v1/me'),
        fetch('/api/v1/parcels/mine'),
        fetch('/api/v1/transfers/queue'),
        fetch('/api/v1/taxes/mine'),
        fetch('/api/v1/disputes'),
      ]);

      if (!meRes.ok) {
        throw new Error('Not authenticated');
      }

      const user = await meRes.json();
      const parcels = parcelsRes.ok ? (await parcelsRes.json()).parcels || [] : [];
      const transfers = transfersRes.ok ? (await transfersRes.json()).transfers || [] : [];
      const taxes = taxesRes.ok ? (await taxesRes.json()).taxes || [] : [];
      const disputes = disputesRes.ok ? (await disputesRes.json()).disputes || [] : [];

      set({ user, parcels, transfers, taxes, disputes, loading: false });
    } catch (error) {
      set({ user: null, loading: false });
      throw error;
    }
  },

  fetchOfficerData: async () => {
    set({ loading: true });
    try {
      const [meRes, queueRes, disputesRes] = await Promise.all([
        fetch('/api/v1/me'),
        fetch('/api/v1/transfers/queue'),
        fetch('/api/v1/disputes/queue'),
      ]);

      if (!meRes.ok) {
        throw new Error('Not authenticated');
      }

      const user = await meRes.json();
      const transfers = queueRes.ok ? (await queueRes.json()).transfers || [] : [];
      const disputes = disputesRes.ok ? (await disputesRes.json()).disputes || [] : [];
      
      let khajanaZones = [];
      if (user.role_code === 'CIRCLE_OFF' || user.role_code === 'VILLAGE_OFF') {
        try {
          const zRes = await fetch('/api/v1/khajana/zones');
          const zData = await zRes.json();
          khajanaZones = zData.zones || [];
        } catch (err) {
          console.error('Failed to load khajana zones', err);
        }
      }

      set({ user, transfers, disputes, khajanaZones, loading: false });
    } catch (error) {
      set({ user: null, loading: false });
      throw error;
    }
  }
}));
