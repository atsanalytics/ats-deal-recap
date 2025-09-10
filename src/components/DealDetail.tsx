import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DealRecap } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';

const DealDetail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [deal, setDeal] = useState<DealRecap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const dealIdParam = searchParams.get('id');
    const dealId = dealIdParam ? parseInt(dealIdParam, 10) : null;

    useEffect(() => {
        if (!dealId) {
            setError('No deal ID provided');
            setLoading(false);
            return;
        }

        const loadDeal = async () => {
            try {
                const sessionStorage = SessionStorageService.getInstance();
                await sessionStorage.initialize();
                
                const deals = sessionStorage.getDeals();
                const foundDeal = deals.find(d => d.id === dealId);
                
                if (foundDeal) {
                    setDeal(foundDeal);
                } else {
                    setError('Deal not found');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load deal');
            } finally {
                setLoading(false);
            }
        };

        loadDeal();
    }, [dealId]);

    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'N/A';
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="deal-detail">
                <div className="loading">
                    <h2>Loading deal details...</h2>
                </div>
            </div>
        );
    }

    if (error || !deal) {
        return (
            <div className="deal-detail">
                <div className="error">
                    <h2>Error</h2>
                    <p>{error || 'Deal not found'}</p>
                    <Link to="/deals" className="btn btn-primary">
                        Back to Deals
                    </Link>
                </div>
            </div>
        );
    }

    const dealData = [
        { label: 'Deal ID', value: deal.id },
        { label: 'Counter Party Company', value: deal.counter_party_company },
        { label: 'Office', value: deal.office },
        { label: 'Desk', value: deal.desk },
        { label: 'Product', value: deal.product },
        { label: 'Laycan Start', value: formatDate(deal.laycan_start) },
        { label: 'Laycan End', value: formatDate(deal.laycan_end) },
        { label: 'Volume', value: `${deal.volume.toLocaleString()} ${deal.volume_uom || 'N/A'}` },
        { label: 'Delivery Method', value: deal.deliver_method || 'N/A' },
        { label: 'Delivery Port', value: deal.delivery_port || 'N/A' },
        { label: 'Vessel Name', value: deal.vessel_name || 'N/A' },
        { label: 'Incoterms', value: deal.inco_term || 'N/A' },
        { label: 'Inspection Agent', value: deal.inspection_agent || 'N/A' },
        { label: 'Price', value: deal.price ? `$${deal.price.toFixed(2)}` : 'N/A' },
        { label: 'Price Basis', value: deal.price_basis || 'N/A' },
        { label: 'Price Differential', value: deal.price_diff ? `$${deal.price_diff.toFixed(2)}` : 'N/A' },
        { label: 'Price Window Start', value: formatDate(deal.price_window_start) },
        { label: 'Price Window End', value: formatDate(deal.price_window_end) },
        { label: 'Currency', value: deal.currency || 'N/A' },
        { label: 'Deal Type', value: deal.deal_type || 'N/A' },
        { label: 'Deal Subtype', value: deal.deal_subtype || 'N/A' },
    ];

    return (
        <div className="deal-detail">
            <div className="deal-detail-header">
                <div className="header-content">
                    <h1>Deal Details</h1>
                    <p>Deal ID: {deal.id}</p>
                </div>
                <div className="header-actions">
                    {deal.email_id && (
                        <Link to={`/emails`} className="btn btn-info">
                            📧 View Related Email
                        </Link>
                    )}
                    {deal.chat_id && (
                        <Link to={`/chat?id=${deal.chat_id}`} className="btn btn-primary">
                            💬 View Related Chat
                        </Link>
                    )}
                    <Link to="/deals" className="btn btn-secondary">
                        Back to Deals
                    </Link>
                </div>
            </div>
            
            <div className="deal-table-container">
                <table className="deal-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dealData.map((item, index) => (
                            <tr key={index}>
                                <td className="field-label">{item.label}</td>
                                <td className="field-value">{item.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DealDetail;
