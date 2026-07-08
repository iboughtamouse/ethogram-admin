import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { mintDiagramUpload, setDiagrams, uploadToBucket } from '../api';
import { useAction } from '../useAction';

const ACCEPTED_TYPES = ['image/webp', 'image/png', 'image/jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;

const diagramShape = PropTypes.shape({
  url: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

function RelabelForm({ slug, diagrams, index, onDone, onCancel }) {
  const [label, setLabel] = useState(diagrams[index].label);
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    const next = diagrams.map((diagram, i) =>
      i === index
        ? { url: diagram.url, label }
        : { url: diagram.url, label: diagram.label }
    );
    await run(() => setDiagrams(slug, { diagrams: next }), onDone);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Label
        <input
          required
          maxLength={255}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save label'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

RelabelForm.propTypes = {
  slug: PropTypes.string.isRequired,
  diagrams: PropTypes.arrayOf(diagramShape).isRequired,
  index: PropTypes.number.isRequired,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

/**
 * Uploads run in three steps — mint a presigned URL, PUT the bytes straight
 * to the bucket, then attach the new URL to the aviary's diagram list. Only
 * the last step changes the draft config; an upload abandoned midway leaves
 * an unreferenced object at a versioned key, which is harmless (the next
 * attempt gets the next version number).
 */
function AddDiagramForm({ slug, diagrams, onDone }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose an image file first.');
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Diagrams must be WebP, PNG, or JPEG images.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        'That image is larger than 10 MB — export a smaller version and retry.'
      );
      return;
    }

    setBusy(true);
    const minted = await mintDiagramUpload({
      aviary: slug,
      label: label.trim(),
      contentType: file.type,
    });
    if (!minted.ok) {
      setBusy(false);
      setError(
        minted.payload?.error || 'Could not start the upload. Please try again.'
      );
      return;
    }

    const uploaded = await uploadToBucket(minted.payload.data.uploadUrl, file);
    if (!uploaded.ok) {
      setBusy(false);
      setError(
        'The image upload failed — check your connection and try again.'
      );
      return;
    }

    const attached = await setDiagrams(slug, {
      diagrams: [
        ...diagrams.map((diagram) => ({
          url: diagram.url,
          label: diagram.label,
        })),
        { url: minted.payload.data.publicUrl, label: label.trim() },
      ],
    });
    setBusy(false);
    if (!attached.ok) {
      setError(
        attached.payload?.error || 'Uploaded, but attaching the diagram failed.'
      );
      return;
    }

    setLabel('');
    if (fileRef.current) fileRef.current.value = '';
    onDone();
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Label
        <input
          required
          maxLength={100}
          value={label}
          placeholder="e.g. Eastern Perimeter"
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <label>
        Image (WebP/PNG/JPEG, max 10 MB)
        {/* No native `required`: the submit handler's "choose a file" error
            covers it with consistent styling (and jsdom can't see files set
            by tests, which would block the implicit submission entirely) */}
        <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Uploading…' : 'Upload diagram'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddDiagramForm.propTypes = {
  slug: PropTypes.string.isRequired,
  diagrams: PropTypes.arrayOf(diagramShape).isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Perch-diagram manager (Phase 3D): view, relabel, reorder, remove, and
 * upload. Every change submits the WHOLE list (the API's replace-set) —
 * removal only detaches a diagram from the draft; published versions keep
 * their frozen URLs, and the objects stay in the bucket.
 */
function DiagramsSection({ slug, diagrams, onChanged }) {
  const [relabeling, setRelabeling] = useState(null); // index being relabeled
  const { error: actionError, run: runAction } = useAction();

  const plain = diagrams.map((diagram) => ({
    url: diagram.url,
    label: diagram.label,
  }));

  function handleDone() {
    setRelabeling(null);
    onChanged();
  }

  async function handleMove(index, delta) {
    const next = [...plain];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    await runAction(() => setDiagrams(slug, { diagrams: next }), onChanged);
  }

  async function handleRemove(index) {
    if (
      !window.confirm(
        `Remove the "${plain[index].label}" diagram from this aviary? Published versions keep their copy; this only changes the draft.`
      )
    ) {
      return;
    }
    const next = plain.filter((_, i) => i !== index);
    await runAction(() => setDiagrams(slug, { diagrams: next }), onChanged);
  }

  return (
    <>
      <h3>Perch diagrams</h3>
      {actionError && <p role="alert">{actionError}</p>}
      <div className="diagrams">
        {diagrams.map((diagram, index) => (
          <figure key={diagram.url}>
            <a href={diagram.url} target="_blank" rel="noreferrer">
              <img src={diagram.url} alt={`Perch diagram: ${diagram.label}`} />
            </a>
            <figcaption>{diagram.label}</figcaption>
            <div className="actions">
              <button type="button" onClick={() => setRelabeling(index)}>
                Relabel…
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => handleMove(index, -1)}
              >
                ← Earlier
              </button>
              <button
                type="button"
                disabled={index === diagrams.length - 1}
                onClick={() => handleMove(index, 1)}
              >
                Later →
              </button>
              <button type="button" onClick={() => handleRemove(index)}>
                Remove
              </button>
            </div>
            {relabeling === index && (
              <RelabelForm
                slug={slug}
                diagrams={plain}
                index={index}
                onDone={handleDone}
                onCancel={() => setRelabeling(null)}
              />
            )}
          </figure>
        ))}
        {diagrams.length === 0 && <p className="hint">No diagrams yet.</p>}
      </div>
      <details>
        <summary>Upload a diagram</summary>
        <AddDiagramForm slug={slug} diagrams={plain} onDone={onChanged} />
      </details>
    </>
  );
}

DiagramsSection.propTypes = {
  slug: PropTypes.string.isRequired,
  diagrams: PropTypes.arrayOf(diagramShape).isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default DiagramsSection;
