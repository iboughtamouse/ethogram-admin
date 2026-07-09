import { useCallback, useState } from 'react';
import { fetchSubmissions, excelDownloadUrl } from '../api';
import { useFetch } from '../useFetch';

const EMPTY_FILTERS = { from: '', to: '', observer: '', aviary: '' };

function SubmissionsPage() {
  // Draft = what's in the form; applied = what the list is filtered by
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const fetcher = useCallback(() => fetchSubmissions(applied), [applied]);
  const { loading, error, data } = useFetch(fetcher);

  function handleSubmit(event) {
    event.preventDefault();
    setApplied(draft);
  }

  function updateDraft(field) {
    return (event) => setDraft({ ...draft, [field]: event.target.value });
  }

  return (
    <>
      <h2>Recent submissions</h2>

      <form className="filters" onSubmit={handleSubmit}>
        <label>
          From
          <input
            type="date"
            value={draft.from}
            onChange={updateDraft('from')}
          />
        </label>
        <label>
          To
          <input type="date" value={draft.to} onChange={updateDraft('to')} />
        </label>
        <label>
          Observer
          <input
            type="text"
            value={draft.observer}
            onChange={updateDraft('observer')}
          />
        </label>
        <label>
          Aviary
          <input
            type="text"
            value={draft.aviary}
            placeholder="name or slug"
            onChange={updateDraft('aviary')}
          />
        </label>
        <button type="submit">Filter</button>
      </form>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {data && data.items.length === 0 && (
        <p>No submissions match these filters.</p>
      )}
      {data && data.items.length > 0 && (
        <>
          <p>
            Showing {data.items.length} of {data.total}{' '}
            {data.total === 1 ? 'submission' : 'submissions'}.
          </p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Observer</th>
                <th>Aviary</th>
                <th>Slots</th>
                <th>Submitted</th>
                <th>Excel</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.observationDate}</td>
                  <td>
                    {item.startTime.slice(0, 5)}–{item.endTime.slice(0, 5)}
                  </td>
                  <td>{item.observerName}</td>
                  <td>{item.aviaryName}</td>
                  <td>{item.slotCount}</td>
                  <td>{new Date(item.submittedAt).toLocaleString()}</td>
                  <td>
                    <a href={excelDownloadUrl(item.id)}>Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

export default SubmissionsPage;
