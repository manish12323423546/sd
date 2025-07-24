"use client"

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { cjsApiService } from '@/lib/services/cjsApiService';

interface CJSApiStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function CJSApiStatus({ showDetails = false, className = '' }: CJSApiStatusProps) {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkApiStatus = async () => {
    setIsChecking(true);
    try {
      const isAvailable = await cjsApiService.checkApiHealth();
      setStatus(isAvailable ? 'available' : 'unavailable');
      setLastCheck(new Date());
    } catch (error) {
      setStatus('unavailable');
      setLastCheck(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
    
    // Check every 5 minutes
    const interval = setInterval(checkApiStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (isChecking) return <Clock className="w-4 h-4 animate-pulse" />;
    if (status === 'available') return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = () => {
    if (isChecking) return <Badge variant="secondary">Checking...</Badge>;
    if (status === 'available') return <Badge variant="default" className="bg-green-600">CJS API Online</Badge>;
    return <Badge variant="destructive">CJS API Offline</Badge>;
  };

  const getStatusMessage = () => {
    if (isChecking) return 'Checking CJS API status...';
    if (status === 'available') return 'CJS API is available for advanced PDF analysis';
    return 'CJS API unavailable - using browser fallback';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        {getStatusBadge()}
        <Button
          variant="ghost"
          size="sm"
          onClick={checkApiStatus}
          disabled={isChecking}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">CJS API Status</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkApiStatus}
            disabled={isChecking}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="space-y-2">
          {getStatusBadge()}
          <p className="text-sm text-muted-foreground">
            {getStatusMessage()}
          </p>
          {lastCheck && (
            <p className="text-xs text-muted-foreground">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>

        {status === 'unavailable' && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>Note:</strong> PDF analysis will automatically fall back to browser-based processing. 
            Start the CJS API server at localhost:3002 for enhanced analysis capabilities.
          </div>
        )}
      </CardContent>
    </Card>
  );
}