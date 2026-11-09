@foreach ($sections as $section)
{!! $section['title'] !!}
@foreach ($section['items'] as $item)
- {!! $item !!}
@endforeach

@endforeach
