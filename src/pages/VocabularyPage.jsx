import { Link } from 'react-router-dom';
import { fetchVocabulary } from '../api';
import { useFetch } from '../useFetch';
import BehaviorCatalog from '../components/BehaviorCatalog';
import OptionsCatalog from '../components/OptionsCatalog';

function VocabularyPage() {
  const { loading, error, data, reload } = useFetch(fetchVocabulary);

  // First load only — during post-mutation reloads the stale catalog keeps
  // rendering so open editor rows and forms survive
  if (loading && !data) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  const aviarySlugs = Object.keys(data.enablement).sort();
  // slug → display name for the enablement matrix column headers (api returns
  // `aviaries`); fall back to the slug for an aviary not in the list
  const aviaryNames = Object.fromEntries(
    (data.aviaries ?? []).map((a) => [a.slug, a.name])
  );

  return (
    <>
      <p className="hint">
        Edits here change the draft — nothing observers see changes until you{' '}
        <Link to="/publish">review and publish</Link>. A behavior or option
        keeps its permanent identity once created: you can fix a label for
        typos, but a change in meaning needs a new entry (retire the old one).
        The ✓ columns show which aviary&apos;s form offers each entry — edit
        that on the aviary&apos;s own page.
      </p>

      <h2>Behavior catalog</h2>
      <BehaviorCatalog
        groups={data.behaviorGroups}
        behaviors={data.behaviors}
        aviarySlugs={aviarySlugs}
        aviaryNames={aviaryNames}
        enablement={data.enablement}
        onChanged={reload}
      />

      <h2>Options</h2>
      <OptionsCatalog
        options={data.options}
        aviarySlugs={aviarySlugs}
        aviaryNames={aviaryNames}
        enablement={data.enablement}
        onChanged={reload}
      />
    </>
  );
}

export default VocabularyPage;
