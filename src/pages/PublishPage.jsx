import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchConfigDiff, publishConfig } from '../api';
import { useFetch } from '../useFetch';
import { useAction } from '../useAction';

/**
 * The review-and-publish step (P3-D3, design §5 MVP): shows what publishing
 * would change (GET /config/diff), blocks on append-only violations, asks for
 * the explicit confirmations the publish endpoint requires when behaviors
 * changed their requires-flags or Excel rows, and publishes with optional
 * notes. Publish is the only write path to config_versions; everything
 * validated here is re-validated server-side inside one transaction.
 */
function PublishPage() {
  const { loading, error, data, reload } = useFetch(fetchConfigDiff);
  const [notes, setNotes] = useState('');
  const [confirmFlags, setConfirmFlags] = useState(false);
  const [confirmRows, setConfirmRows] = useState(false);
  const [published, setPublished] = useState(null);
  const { busy, error: publishError, run } = useAction();

  if (loading && !data) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  async function handlePublish(event) {
    event.preventDefault();
    const body = {};
    if (notes.trim()) body.notes = notes.trim();
    if (confirmFlags) body.confirmFlagChanges = true;
    if (confirmRows) body.confirmRowMapChanges = true;
    await run(
      () => publishConfig(body),
      (result) => {
        setPublished(result);
        setNotes('');
        setConfirmFlags(false);
        setConfirmRows(false);
      }
    );
    // Refresh the review either way: on success the diff is clean again; on
    // failure the server may know about draft changes this page's mount-time
    // diff didn't (e.g. a confirmation it now requires) — without the
    // refresh the needed checkbox never renders and the page dead-ends
    reload();
  }

  const needsFlagConfirm = data.flagChanges.length > 0;
  const needsRowConfirm = data.rowMapChanges.length > 0;
  const blocked = data.violations.length > 0;
  const canPublish =
    !data.identical &&
    !blocked &&
    !busy &&
    (!needsFlagConfirm || confirmFlags) &&
    (!needsRowConfirm || confirmRows);

  return (
    <>
      <h2>Publish</h2>

      {published && (
        <section className="publish-success" role="status">
          <h3>Published version {published.version}</h3>
          <ul>
            {published.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
          <p>
            It&apos;s live for observers now. See it in the{' '}
            <Link to="/versions">version history</Link>.
          </p>
        </section>
      )}

      {data.identical ? (
        <p>
          Nothing to publish — the draft matches published version{' '}
          {data.latestVersion}.
        </p>
      ) : (
        <>
          <p>
            {data.latestVersion === null
              ? 'This will be the first published version.'
              : `Draft changes since version ${data.latestVersion}:`}
          </p>
          <ul>
            {data.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>

          {blocked && (
            <section role="alert">
              <h3>Publish blocked</h3>
              <p>
                These changes would break values already in a published version.
                Fix them in the draft, then come back:
              </p>
              <ul>
                {data.violations.map((violation) => (
                  <li key={violation}>{violation}</li>
                ))}
              </ul>
            </section>
          )}

          {!blocked && (
            <form onSubmit={handlePublish}>
              {needsFlagConfirm && (
                <label className="confirm">
                  <input
                    type="checkbox"
                    checked={confirmFlags}
                    onChange={(event) => setConfirmFlags(event.target.checked)}
                  />
                  These behaviors changed which extra fields they need:{' '}
                  <strong>{data.flagChanges.join(', ')}</strong>. I understand
                  this changes how future observations are entered (past
                  observations are unaffected).
                </label>
              )}
              {needsRowConfirm && (
                <label className="confirm">
                  <input
                    type="checkbox"
                    checked={confirmRows}
                    onChange={(event) => setConfirmRows(event.target.checked)}
                  />
                  These behaviors changed their Excel row label or position:{' '}
                  <strong>{data.rowMapChanges.join(', ')}</strong>. I understand
                  this changes how future workbooks render (past workbooks are
                  unaffected).
                </label>
              )}
              <label htmlFor="publish-notes">
                Notes (optional, but a line here saves the next person guessing)
              </label>
              <textarea
                id="publish-notes"
                rows={3}
                maxLength={1000}
                placeholder="What changed and why — shown in the version history"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <button type="submit" disabled={!canPublish}>
                {busy ? 'Publishing…' : 'Publish'}
              </button>
              {publishError && <p role="alert">{publishError}</p>}
            </form>
          )}
        </>
      )}
    </>
  );
}

export default PublishPage;
