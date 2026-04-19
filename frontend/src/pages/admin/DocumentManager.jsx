/**
 * DocumentManager — View and manage indexed legal documents.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getDocuments, deleteDocument } from '../../services/adminApi';
import { SimpleTableRowsSkeleton } from '../../components/SkeletonLoader';

export default function DocumentManager() {
    const [data, setData] = useState({ documents: [], total: 0, page: 1, per_page: 20 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDocs = useCallback(async (page = 1) => {
        setLoading(true);
        const minDelay = new Promise(r => setTimeout(r, 1200));
        try {
            const res = await getDocuments(page, 20, search);
            setData(res);
        } catch (err) {
            setError(err.message);
        } finally {
            await minDelay;
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchDocs(1); }, [fetchDocs]);

    const handleDelete = async (docId) => {
        if (!window.confirm('Delete this document chunk? This cannot be undone.')) return;
        try {
            await deleteDocument(docId);
            fetchDocs(data.page);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <>
            <div className="admin-page-header">
                <h1>Document Manager</h1>
                <p>{data.total} indexed document chunks</p>
            </div>

            <div className="admin-table-container">
                <div className="admin-table-toolbar">
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by source name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchDocs(1)}
                    />
                    <button className="admin-btn admin-btn-ghost" onClick={() => fetchDocs(1)}>
                        🔍 Search
                    </button>
                </div>

                {loading ? (
                    <SimpleTableRowsSkeleton rows={8} cols={6} />
                ) : error ? (
                    <div className="admin-empty">⚠️ {error}</div>
                ) : data.documents.length === 0 ? (
                    <div className="admin-empty">No documents found</div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Act Type</th>
                                    <th>Chunk</th>
                                    <th>Preview</th>
                                    <th>Indexed</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td style={{ fontWeight: 600, color: '#fff' }}>{doc.source}</td>
                                        <td>
                                            {doc.act_type ? (
                                                <span className="admin-badge info">{doc.act_type}</span>
                                            ) : '—'}
                                        </td>
                                        <td>#{doc.chunk_index}</td>
                                        <td style={{
                                            maxWidth: 250, overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)'
                                        }}>
                                            {doc.content_preview}
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <button
                                                className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {data.total > data.per_page && (
                            <div className="admin-pagination">
                                <button
                                    disabled={data.page <= 1}
                                    onClick={() => fetchDocs(data.page - 1)}
                                >
                                    ← Prev
                                </button>
                                <span className="admin-pagination-info">
                                    Page {data.page} · {data.total} total
                                </span>
                                <button
                                    disabled={data.documents.length < data.per_page}
                                    onClick={() => fetchDocs(data.page + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
