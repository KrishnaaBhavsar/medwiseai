import { useState, useEffect } from "react";
import { Loader2, Map as MapIcon, ExternalLink } from "lucide-react";

interface DonationCenter {
    name: string;
    address: string;
    phone: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    type: string;
}

interface MapProps {
    centers: DonationCenter[];
    centerLocation?: [number, number];
}

export default function DonationMap({ centers, centerLocation }: MapProps) {
    const [mapLoading, setMapLoading] = useState(true);

    // Use the first valid center's coordinates or the provided centerLocation
    const activeLat = centerLocation?.[0] || centers?.[0]?.coordinates?.lat;
    const activeLng = centerLocation?.[1] || centers?.[0]?.coordinates?.lng;

    useEffect(() => {
        setMapLoading(true);
    }, [activeLat, activeLng]);

    // If no coordinates available yet, show a placeholder
    if (!activeLat || !activeLng) {
        return (
            <div className="h-[450px] w-full rounded-2xl bg-muted/30 border-4 border-white shadow-2xl flex flex-col items-center justify-center space-y-4">
                <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center shadow-inner">
                    <MapIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Waiting for location data...</p>
            </div>
        );
    }

    // Professional Google Maps Embed URL (No API key needed for this legacy format, highly reliable)
    const mapUrl = `https://maps.google.com/maps?q=${activeLat},${activeLng}&z=15&output=embed&iwloc=near`;

    return (
        <div className="h-[450px] w-full rounded-2xl overflow-hidden border-4 border-white shadow-2xl relative bg-muted/20">
            {mapLoading && (
                <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-bold text-primary animate-pulse">Initializing Professional Map...</p>
                </div>
            )}

            <iframe
                title="Donation Center Location"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={mapUrl}
                allowFullScreen
                onLoad={() => setMapLoading(false)}
                className="transition-opacity duration-700 ease-in-out"
            />

            {/* Link to open in full Google Maps */}
            <a
                href={`https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 z-[20] bg-white/90 hover:bg-white text-primary p-2 px-3 rounded-full text-[10px] font-bold shadow-lg border border-primary/20 flex items-center gap-2 hover:scale-105 transition-transform"
            >
                <ExternalLink className="h-3 w-3" />
                Open Full Maps
            </a>
        </div>
    );
}
