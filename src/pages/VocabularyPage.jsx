import { fetchVocabulary } from '../api';
import { useFetch } from '../useFetch';

const OPTION_KIND_LABELS = {
  object: 'Objects',
  object_interaction: 'Object interactions',
  animal: 'Animals',
  animal_interaction: 'Animal interactions',
};

const FLAG_LABELS = {
  requiresLocation: 'location',
  requiresObject: 'object',
  requiresObjectInteraction: 'object interaction',
  requiresAnimal: 'animal',
  requiresAnimalInteraction: 'animal interaction',
  requiresDescription: 'description',
};

function flagSummary(behavior) {
  const flags = Object.entries(FLAG_LABELS)
    .filter(([key]) => behavior[key])
    .map(([, label]) => label);
  return flags.length ? flags.join(', ') : '—';
}

function VocabularyPage() {
  const { loading, error, data } = useFetch(fetchVocabulary);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  const aviarySlugs = Object.keys(data.enablement).sort();

  return (
    <>
      <h2>Behavior catalog</h2>
      {data.behaviorGroups.map((group) => {
        const rows = data.behaviors.filter((b) => b.group === group.name);
        if (!rows.length) return null;
        return (
          <section key={group.name}>
            <h3>{group.name}</h3>
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th>Requires</th>
                  <th>Excel row</th>
                  {aviarySlugs.map((slug) => (
                    <th key={slug}>{slug}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((behavior) => (
                  <tr
                    key={behavior.value}
                    className={behavior.retired ? 'retired' : undefined}
                  >
                    <td>
                      {behavior.label}
                      {behavior.retired && (
                        <span className="badge badge-warn">Retired</span>
                      )}
                    </td>
                    <td>{behavior.value}</td>
                    <td>{flagSummary(behavior)}</td>
                    <td>{behavior.excelRowLabel}</td>
                    {aviarySlugs.map((slug) => (
                      <td key={slug}>
                        {data.enablement[slug].behaviors.includes(
                          behavior.value
                        )
                          ? '✓'
                          : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <h2>Options</h2>
      {Object.entries(OPTION_KIND_LABELS).map(([kind, label]) => (
        <section key={kind}>
          <h3>{label}</h3>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Value</th>
                {aviarySlugs.map((slug) => (
                  <th key={slug}>{slug}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.options[kind].map((option) => (
                <tr
                  key={option.value}
                  className={option.retired ? 'retired' : undefined}
                >
                  <td>
                    {option.label}
                    {option.retired && (
                      <span className="badge badge-warn">Retired</span>
                    )}
                  </td>
                  <td>{option.value}</td>
                  {aviarySlugs.map((slug) => (
                    <td key={slug}>
                      {data.enablement[slug][kind].includes(option.value)
                        ? '✓'
                        : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}

export default VocabularyPage;
