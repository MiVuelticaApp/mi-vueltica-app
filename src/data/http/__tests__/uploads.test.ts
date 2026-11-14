import { photoTypeOf } from '../uploads';

describe('photoTypeOf (#15)', () => {
  it('labels the upload with the file real type, JPEG by default', () => {
    expect(photoTypeOf('file:///cache/ImagePicker/abc.png')).toEqual({ name: 'photo.png', type: 'image/png' });
    expect(photoTypeOf('file:///cache/abc.WEBP')).toEqual({ name: 'photo.webp', type: 'image/webp' });
    expect(photoTypeOf('file:///cache/abc.jpeg')).toEqual({ name: 'photo.jpg', type: 'image/jpeg' });
    expect(photoTypeOf('content://media/external/images/media/42')).toEqual({ name: 'photo.jpg', type: 'image/jpeg' });
    expect(photoTypeOf('file:///cache/abc.png?v=2')).toEqual({ name: 'photo.png', type: 'image/png' });
  });
});
