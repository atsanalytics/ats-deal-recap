import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DealRecap } from '../services';
import { SessionStorageService } from '../services/SessionStorageService';

const DealList: React.FC = () => {
    const [deals, setDeals] = useState<DealRecap[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDeals = async () => {
            try {
                setLoading(true);
                const sessionStorage = SessionStorageService.getInstance();
                await sessionStorage.initialize();
                
                const dealsData = sessionStorage.getDeals();
                setDeals(dealsData);
            } catch (err) {
                console.error('Error loading deals:', err);
            } finally {
                setLoading(false);
            }
        };

        loadDeals();
    }, []);

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
            <div className="deal-list">
                <div className="loading">
                    <h2>Loading deals...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="deal-list">
            <div className="deal-list-header">
                <h1>Deals Overview</h1>
                <p>Total deals: {deals.length}</p>
            </div>

            <div className="deal-table-container">
                <table className="deal-list-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Counter Party</th>
                            <th>Product</th>
                            <th>Volume</th>
                            <th>Delivery Port</th>
                            <th>Laycan</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Source</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deals.map((deal) => (
                            <tr key={deal.id}>
                                <td className="deal-id">{deal.id}</td>
                                <td className="counter-party">{deal.counter_party_company}</td>
                                <td className="product">
                                    <span className={`product-badge ${deal.product}`}>
                                        {deal.product}
                                    </span>
                                </td>
                                <td className="volume">
                                    {deal.volume.toLocaleString()} {deal.volume_uom}
                                </td>
                                <td className="delivery-port">{deal.delivery_port}</td>
                                <td className="laycan">
                                    {formatDate(deal.laycan_start)} - {formatDate(deal.laycan_end)}
                                </td>
                                <td className="price-info">
                                    {deal.price ? (
                                        <span className="fixed-price">
                                            ${deal.price.toFixed(2)}
                                        </span>
                                    ) : (
                                        <div className="price-basis-diff">
                                            <span className="price-basis">{deal.price_basis}</span>
                                            <span className={`price-diff ${(deal.price_diff || 0) >= 0 ? 'positive' : 'negative'}`}>
                                                {(deal.price_diff || 0) >= 0 ? '+' : ''}{(deal.price_diff || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="status">
                                    {deal.deal_subtype?.toUpperCase()}
                                </td>
                                <td className="source">
                                    {deal.email_id ? (
                                        <Link 
                                            to={`/email?id=${deal.email_id}`} 
                                            className="btn btn-xs btn-email"
                                            title="View related email"
                                        >
                                            EMAIL
                                        </Link>
                                    ) : deal.chat_id ? (
                                        <Link 
                                            to={`/chat?id=${deal.chat_id}`} 
                                            className="btn btn-xs btn-chat"
                                            title="View related chat"
                                        >
                                            CHAT
                                        </Link>
                                    ) : (
                                        <span className="no-source">-</span>
                                    )}
                                </td>
                                <td className="actions">
                                    <Link 
                                        to={`/deal?id=${deal.id}`} 
                                        className="btn btn-xs btn-view"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DealList;
