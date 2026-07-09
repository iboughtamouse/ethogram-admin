import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagramsSection from './DiagramsSection';
import { mintDiagramUpload, setDiagrams, uploadToBucket } from '../api';

vi.mock('../api', () => ({
  mintDiagramUpload: vi.fn(),
  setDiagrams: vi.fn(),
  uploadToBucket: vi.fn(),
}));

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

const DIAGRAMS = [
  {
    url: 'https://pub-x.r2.dev/perch-diagram-cove-east-v1.webp',
    label: 'East',
  },
  {
    url: 'https://pub-x.r2.dev/perch-diagram-cove-west-v1.webp',
    label: 'West',
  },
];

let onChanged;

beforeEach(() => {
  vi.clearAllMocks();
  onChanged = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSection(diagrams = DIAGRAMS) {
  render(
    <DiagramsSection
      slug="sayyidas-cove"
      diagrams={diagrams}
      onChanged={onChanged}
    />
  );
}

describe('DiagramsSection', () => {
  it('uploads in three steps: mint → PUT bytes → attach via replace-set', async () => {
    mintDiagramUpload.mockResolvedValueOnce(
      ok({
        uploadUrl: 'https://bucket.example/presigned',
        publicUrl: 'https://pub-x.r2.dev/perch-diagram-cove-north-v1.webp',
        key: 'perch-diagram-cove-north-v1.webp',
      })
    );
    uploadToBucket.mockResolvedValueOnce({ ok: true, status: 200 });
    setDiagrams.mockResolvedValueOnce(ok({ count: 3 }));
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText('Upload a diagram'));
    await user.type(screen.getByLabelText('Label'), 'North');
    const file = new File(['bytes'], 'north.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/image \(webp/i), file);
    await user.click(screen.getByRole('button', { name: 'Upload diagram' }));

    expect(mintDiagramUpload).toHaveBeenCalledWith({
      aviary: 'sayyidas-cove',
      label: 'North',
      contentType: 'image/webp',
    });
    expect(uploadToBucket).toHaveBeenCalledWith(
      'https://bucket.example/presigned',
      file
    );
    expect(setDiagrams).toHaveBeenCalledWith('sayyidas-cove', {
      diagrams: [
        ...DIAGRAMS,
        {
          url: 'https://pub-x.r2.dev/perch-diagram-cove-north-v1.webp',
          label: 'North',
        },
      ],
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('rejects oversized and wrong-type files before minting anything', async () => {
    // applyAccept: false — the OS picker's filter is advisory; the component's
    // own type check is the guard under test
    const user = userEvent.setup({ applyAccept: false });
    renderSection();

    await user.click(screen.getByText('Upload a diagram'));
    await user.type(screen.getByLabelText('Label'), 'Bad');
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/image \(webp/i), pdf);
    await user.click(screen.getByRole('button', { name: 'Upload diagram' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /WebP, PNG, or JPEG/
    );
    expect(mintDiagramUpload).not.toHaveBeenCalled();

    const big = new File(['x'], 'big.webp', { type: 'image/webp' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await user.upload(screen.getByLabelText(/image \(webp/i), big);
    await user.click(screen.getByRole('button', { name: 'Upload diagram' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/10 MB/);
    expect(mintDiagramUpload).not.toHaveBeenCalled();
  });

  it("surfaces the server's message when minting fails (e.g. uploads unconfigured)", async () => {
    mintDiagramUpload.mockResolvedValueOnce({
      ok: false,
      status: 503,
      payload: {
        success: false,
        error:
          'Uploads are not configured on this server — the R2 credentials are missing.',
      },
    });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText('Upload a diagram'));
    await user.type(screen.getByLabelText('Label'), 'North');
    await user.upload(
      screen.getByLabelText(/image \(webp/i),
      new File(['x'], 'n.webp', { type: 'image/webp' })
    );
    await user.click(screen.getByRole('button', { name: 'Upload diagram' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /not configured/
    );
    expect(uploadToBucket).not.toHaveBeenCalled();
    expect(setDiagrams).not.toHaveBeenCalled();
  });

  it('does not attach when the bucket PUT fails', async () => {
    mintDiagramUpload.mockResolvedValueOnce(
      ok({
        uploadUrl: 'https://bucket.example/presigned',
        publicUrl: 'https://pub-x.r2.dev/x.webp',
      })
    );
    uploadToBucket.mockResolvedValueOnce({ ok: false, status: 0 });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText('Upload a diagram'));
    await user.type(screen.getByLabelText('Label'), 'North');
    await user.upload(
      screen.getByLabelText(/image \(webp/i),
      new File(['x'], 'n.webp', { type: 'image/webp' })
    );
    await user.click(screen.getByRole('button', { name: 'Upload diagram' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /upload failed/i
    );
    expect(setDiagrams).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('relabels via a full replace-set', async () => {
    setDiagrams.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getAllByRole('button', { name: 'Relabel…' })[0]);
    // The collapsed upload form also has a "Label" field — scope to the editor
    const editorForm = screen
      .getByRole('button', { name: 'Save label' })
      .closest('form');
    const input = within(editorForm).getByLabelText('Label');
    await user.clear(input);
    await user.type(input, 'Eastern Perimeter');
    await user.click(screen.getByRole('button', { name: 'Save label' }));

    expect(setDiagrams).toHaveBeenCalledWith('sayyidas-cove', {
      diagrams: [
        { url: DIAGRAMS[0].url, label: 'Eastern Perimeter' },
        { url: DIAGRAMS[1].url, label: 'West' },
      ],
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('reorders with the full list in the new order', async () => {
    setDiagrams.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderSection();

    await user.click(
      screen.getAllByRole('button', { name: /Move .* right/ })[0]
    );

    expect(setDiagrams).toHaveBeenCalledWith('sayyidas-cove', {
      diagrams: [
        { url: DIAGRAMS[1].url, label: 'West' },
        { url: DIAGRAMS[0].url, label: 'East' },
      ],
    });
  });

  it('removes after in-app confirmation, submitting the remaining list', async () => {
    setDiagrams.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderSection();

    // In-app confirm (SM-1): arm, then confirm
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getByText('Remove "East"?')).toBeInTheDocument();
    expect(setDiagrams).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(setDiagrams).toHaveBeenCalledWith('sayyidas-cove', {
      diagrams: [{ url: DIAGRAMS[1].url, label: 'West' }],
    });
  });
});
