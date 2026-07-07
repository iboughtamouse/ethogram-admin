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

  return (
    <>
      <p className="hint">
        Edits here change the draft config — nothing observers see changes until
        it is published. Values are permanent wire identities: fix a label for
        typos, but a change in meaning needs a new entry (retire the old one).
        Which entries an aviary offers is edited on that aviary's page.
      </p>

      <h2>Behavior catalog</h2>
      <BehaviorCatalog
        groups={data.behaviorGroups}
        behaviors={data.behaviors}
        aviarySlugs={aviarySlugs}
        enablement={data.enablement}
        onChanged={reload}
      />

      <h2>Options</h2>
      <OptionsCatalog
        options={data.options}
        aviarySlugs={aviarySlugs}
        enablement={data.enablement}
        onChanged={reload}
      />
    </>
  );
}

export default VocabularyPage;
