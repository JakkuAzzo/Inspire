import type { InspireAnyPack, ModePack } from '../types';

const API_BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, init);
        if (!response.ok) {
                const detail = await response.text();
                throw new Error(detail || 'Request failed');
        }
        return (await response.json()) as T;
}

export interface SaveResponse {
        saved: boolean;
        userId: string;
        packId: string;
        snapshot?: InspireAnyPack;
}

export interface ShareResponse {
        token: string;
        shareUrl: string;
        packId: string;
}

export async function fetchPackById(id: string): Promise<InspireAnyPack> {
        return apiFetch<InspireAnyPack>(`/packs/${encodeURIComponent(id)}`);
}

export async function listSavedPacks(userId: string): Promise<InspireAnyPack[]> {
        const qs = new URLSearchParams({ userId });
        const data = await apiFetch<{ packs: InspireAnyPack[] }>(`/packs/saved?${qs.toString()}`);
        return Array.isArray(data.packs) ? data.packs : [];
}

export async function savePack(packId: string, userId: string): Promise<SaveResponse> {
        return apiFetch<SaveResponse>(`/packs/${encodeURIComponent(packId)}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
        });
}

export async function remixPack(packId: string, userId: string, snapshot?: ModePack): Promise<ModePack> {
        const data = await apiFetch<{ remix: ModePack }>(`/packs/${encodeURIComponent(packId)}/remix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, snapshot })
        });
        return data.remix;
}

export async function sharePack(packId: string, userId?: string): Promise<ShareResponse> {
        return apiFetch<ShareResponse>(`/packs/${encodeURIComponent(packId)}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
        });
}

export async function fetchSharedPack(token: string): Promise<InspireAnyPack> {
        const data = await apiFetch<{ pack: InspireAnyPack }>(`/share/${encodeURIComponent(token)}`);
        return data.pack;
}
