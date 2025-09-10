import React, { useState, useEffect } from 'react';
import { createDealService, DealRecapUser } from '../services';

const Users: React.FC = () => {
    const [users, setUsers] = useState<DealRecapUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoading(true);
                const dealService = createDealService();
                const usersData = await dealService.getAllUsers();
                setUsers(usersData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, []);

    if (loading) {
        return (
            <div className="container">
                <div className="loading">
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="error">
                    <h1>Error</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="deal-list">
            <div className="deal-list-header">
                <h1>Users Overview</h1>
                <p>Total users: {users.length}</p>
            </div>

            <div className="deal-table-container">
                <table className="deal-list-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Company</th>
                            <th>Office</th>
                            <th>Desk</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="no-data">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id}>
                                    <td className="deal-id">{user.id}</td>
                                    <td className="counter-party">{user.name}</td>
                                    <td className="delivery-port">{user.email || 'N/A'}</td>
                                    <td className="counter-party">{user.company || 'N/A'}</td>
                                    <td className="delivery-port">{user.office || 'N/A'}</td>
                                    <td className="product">
                                        {user.desk ? (
                                            <span className={`product-badge ${user.desk}`}>
                                                {user.desk}
                                            </span>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td className="status">
                                        <span className={`status-badge ${user.is_couterparty ? 'counterparty' : 'our-trader'}`}>
                                            {user.is_couterparty ? 'Counterparty' : 'Our Trader'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Users;
