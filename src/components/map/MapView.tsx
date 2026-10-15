"use client";

import { useCallback, useEffect, useRef } from "react";

import * as maplibregl from "maplibre-gl";
import {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Bbox, ConfidenceClass, HotspotFeature } from "@/lib/types";
import { formatUTC, formatWIB } from "@/lib/utils/time";

export interface MapViewProps {
  features: HotspotFeature[];
  styleUrl: string;
  showHotspots: boolean;
  userLocation: { lat: number; lon: number } | null;
  onBoundsChange: (bbox: Bbox) => void;
}

const INDONESIA_BOUNDS: [number, number, number, number] = [94.5, -11.5, 141.5, 6.5];
const SOURCE_ID = "hotspots";
const CLUSTER_LAYER = "hotspots-clusters";
const CLUSTER_COUNT_LAYER = "hotspots-cluster-count";
const POINT_LAYER = "hotspots-points";

const CONFIDENCE_LABEL: Record<ConfidenceClass, string> = {
  high: "Tinggi",
  nominal: "Sedang",
  low: "Rendah",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function popupHtml(feature: HotspotFeature): string {
  const confidence = CONFIDENCE_LABEL[feature.confidenceClass] ?? feature.confidenceClass;
  const frp = feature.frp === null ? "tidak tersedia" : `${feature.frp} MW`;
  const daynight =
    feature.daynight === "D" ? "Siang" : feature.daynight === "N" ? "Malam" : "-";

  return `
    <div style="max-width: 260px; font-size: 13px; line-height: 1.45;">
      <p style="margin: 0 0 6px; font-weight: 600;">Titik panas satelit</p>
      <p style="margin: 0 0 2px;">Waktu: ${escapeHtml(formatWIB(feature.acqAt))} (${escapeHtml(formatUTC(feature.acqAt))})</p>
      <p style="margin: 0 0 2px;">Satelit: ${escapeHtml(feature.satellite)} · ${escapeHtml(feature.instrument)}</p>
      <p style="margin: 0 0 2px;">Kepercayaan: ${escapeHtml(confidence)} (${escapeHtml(feature.confidenceRaw)})</p>
      <p style="margin: 0 0 2px;">FRP: ${escapeHtml(frp)} · ${escapeHtml(daynight)}</p>
      <p style="margin: 0 0 6px; color: #64748b;">Sumber: NASA FIRMS (${escapeHtml(feature.source)})</p>
      <p style="margin: 0; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #475569;">
        Titik panas = anomali panas yang terdeteksi satelit, belum tentu kebakaran.
      </p>
    </div>
  `;
}

function toFeatureCollection(features: HotspotFeature[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map((f) => ({
      type: "Feature",
      id: f.id,
      geometry: { type: "Point", coordinates: [f.lon, f.lat] },
      properties: {
        id: f.id,
        acqAt: f.acqAt,
        satellite: f.satellite,
        instrument: f.instrument,
        confidenceClass: f.confidenceClass,
        confidenceRaw: f.confidenceRaw,
        frp: f.frp,
        daynight: f.daynight,
        source: f.source,
      },
    })),
  };
}

export default function MapView({
  features,
  styleUrl,
  showHotspots,
  userLocation,
  onBoundsChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const featuresRef = useRef<HotspotFeature[]>(features);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const moveEndTimer = useRef<number | null>(null);

  featuresRef.current = features;
  onBoundsChangeRef.current = onBoundsChange;

  const emitBounds = useCallback((map: MapLibreMap) => {
    const bounds = map.getBounds();
    onBoundsChangeRef.current({
      west: Number(bounds.getWest().toFixed(4)),
      south: Number(bounds.getSouth().toFixed(4)),
      east: Number(bounds.getEast().toFixed(4)),
      north: Number(bounds.getNorth().toFixed(4)),
    });
  }, []);

  // --- Map initialisation (once) --------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      bounds: INDONESIA_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      maxZoom: 14, // hot-spot data is not meaningful beyond this zoom
      // Keep panning near Indonesia: protects tile budget and avoids empty views.
      maxBounds: [
        [88, -18],
        [148, 12],
      ],
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(featuresRef.current),
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 50,
      });

      // Cluster bubbles (neutral colour: clusters mix confidence classes).
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1d4ed8",
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            2,
            14,
            20,
            20,
            200,
            28,
          ],
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Individual hot spots: colour = confidence, size = FRP.
      // Non-colour cues (stroke width + legend text) keep this accessible.
      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "confidenceClass"],
            "high",
            "#dc2626",
            "nominal",
            "#ea580c",
            "low",
            "#a16207",
            "#64748b",
          ],
          "circle-opacity": [
            "match",
            ["get", "confidenceClass"],
            "low",
            0.6,
            0.9,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": [
            "match",
            ["get", "confidenceClass"],
            "high",
            2.5,
            "nominal",
            1.5,
            1,
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "frp"], 0],
            0,
            5,
            50,
            9,
            300,
            14,
          ],
        },
      });

      map.on("click", CLUSTER_LAYER, (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [CLUSTER_LAYER],
        })[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        if (clusterId === undefined) return;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = feature.geometry as GeoJSON.Point;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
          });
        });
      });

      map.on("click", POINT_LAYER, (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [POINT_LAYER],
        })[0];
        if (!feature) return;
        const props = feature.properties as Record<string, unknown>;
        const hotspot: HotspotFeature = {
          id: String(props.id ?? ""),
          lat: (feature.geometry as GeoJSON.Point).coordinates[1],
          lon: (feature.geometry as GeoJSON.Point).coordinates[0],
          acqAt: String(props.acqAt ?? ""),
          satellite: String(props.satellite ?? ""),
          instrument: String(props.instrument ?? ""),
          confidenceClass: (props.confidenceClass as ConfidenceClass) ?? "nominal",
          confidenceRaw: String(props.confidenceRaw ?? ""),
          frp: props.frp === null || props.frp === undefined ? null : Number(props.frp),
          daynight: props.daynight === "D" || props.daynight === "N" ? props.daynight : null,
          source: String(props.source ?? ""),
        };
        new maplibregl.Popup({ closeButton: true, maxWidth: "280px" })
          .setLngLat([hotspot.lon, hotspot.lat])
          .setHTML(popupHtml(hotspot))
          .addTo(map);
      });

      for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Viewport-based loading: report bounds after the user stops moving.
      map.on("moveend", () => {
        if (moveEndTimer.current !== null) window.clearTimeout(moveEndTimer.current);
        moveEndTimer.current = window.setTimeout(() => emitBounds(map), 600);
      });

      // First viewport load (server already sent a national payload).
      emitBounds(map);
    });

    return () => {
      if (moveEndTimer.current !== null) window.clearTimeout(moveEndTimer.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; props read via refs
  }, []);

  // --- Push new data into the source ----------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) source.setData(toFeatureCollection(features));
  }, [features]);

  // --- Layer visibility toggle ----------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const visibility = showHotspots ? "visible" : "none";
    for (const layer of [CLUSTER_LAYER, CLUSTER_COUNT_LAYER, POINT_LAYER]) {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", visibility);
    }
  }, [showHotspots, features]);

  // --- "Lokasi saya" marker (only after the user presses the button) --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 0 2px #1e3a8a;";
      el.setAttribute("aria-label", "Lokasi saya");
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
    }
    map.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: 10 });
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label="Peta titik panas satelit. Gunakan tombol dan daftar ringkasan untuk informasi yang dapat dibaca pembaca layar."
    />
  );
}
